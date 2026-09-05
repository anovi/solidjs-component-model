import {
  batch,
  createSignal,
  type Accessor,
  type Setter,
  untrack,
} from "solid-js";
import {
  createStore,
  unwrap,
  type SetStoreFunction,
  type Store,
} from "solid-js/store";
import {
  Subject,
  type Observer,
  type Observable,
  type Unsubscribable,
} from "./observable";

import { Scheduler } from "./scheduler";
import {
  type AnyModelData,
  type EventType,
  type InvokeParams,
  type Snapshot,
  type FrameworkConfig,
  type Status,
  InternalEventName,
  type InvokedNext,
  type InvokedError,
  type InvokedDone,
  type InternalEvent,
  type AnyModel,
  type Eventless,
} from "./types";
import {
  StateChart,
  Interpreter,
  type Event,
  type EventName,
  type Transition,
  type TransitionStep,
  MachineMalformed,
} from "./state-chart";
import { type Logger } from "./logger";
import { Queue } from "./queue";
import type { Span, Tracer } from "./tracer-types";
import { EffectFailed, Violation } from "./errors";
import type { Model } from "./interfaces";
import { Stack } from "./stack";
import { hasToJSON, isClassInstance } from "./object";
import type { ScheduledExecute } from "./events";
import type { InvokeConfig } from "./state-chart/state-chart-types";

type SendApi<E extends { type: string }> = {
  [K in EventName<E>]: (
    payload?: Omit<Extract<E, { type: K }>, "type">
  ) => void;
};

interface ModelConstructor<TModel extends AnyModel, E extends Event> {
  new (...args: never[]): AnyComponentModel;
  chart?: StateChart<TModel, E>;
}

interface ModelCtorWithChildren {
  new (...args: never[]): AnyComponentModel;
  childTypes: ChildTypes;
}

interface ComponentModelConstructor {
  new (...args: never[]): AnyComponentModel;
  isModelSnapshot: (value: unknown) => boolean;
  __fromSnapshot: (
    snapshot: unknown,
    ownerCtor?: ModelCtorWithChildren
  ) => AnyComponentModel;
  fromJSON: <Model extends AnyComponentModel>(snapshot: unknown) => Model;
}

type AnyModelConstructor = ModelConstructor<AnyModel, Event>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyComponentModel = ComponentModel<any, any, any, any>;

type Invoked = {
  controller: AbortController;
  cleanup?: () => void;
};

type ChildTypes = {
  [key: string]: AnyModelConstructor;
};

const STATELESS = () => "";
const NOOP_STATE_SETTER = () => undefined;

/** All models that are currently alive. */
const aliveModels = new Map<string, AnyComponentModel>();

/** Stack consist of models that are currently handling an action (a model can cause execution of an action in another model) */
const actionsExecutionStack: Stack<AnyComponentModel> = new Stack();

/** The [key] is a model's ID and the [value] is an array of its children.  */
const modelChildrenMap = new Map<string, AnyComponentModel[]>();

/**
 * Allow to call protected method enqueue.
 * This flag is needed to call this method outside of effects.
 * Usually it's from `dispatch` method.
 */
let allowNextEnqueue = false;

/**
 * Decorator that wraps a method so its body is enqueued as an effect
 * and the queue is processed. Use on methods in classes extending ComponentModel.
 */
export function action(
  _target: object,
  _propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;
  descriptor.value = function (this: AnyComponentModel, ...args: unknown[]) {
    allowNextEnqueue = true;
    this.enqueue(() => {
      originalMethod.apply(this, args);
    });
  };
  return descriptor;
}

/** Decorator for protected method. Does not allow a target to be called outside effects.  */
export function protectedMethod(
  _target: object,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;
  descriptor.value = function (this: AnyComponentModel, ...args: unknown[]) {
    if (
      !allowNextEnqueue &&
      propertyKey === "enqueue" &&
      actionsExecutionStack.peek() !== this
    ) {
      console.error(new Violation(propertyKey));
      return;
    }
    return originalMethod.apply(this, args);
  };
  return descriptor;
}

/** Dynamic decorator for protected method. Does not allow a target to be called outside effects.  */
function protectMethod<T extends (...args: unknown[]) => unknown>(
  method: T,
  propertyKey: string
): T {
  return function (this: AnyComponentModel, ...args: Parameters<T>) {
    if (actionsExecutionStack.peek() !== this) {
      console.error(new Violation(propertyKey));
      return;
    }

    return method.apply(this, args);
  } as T;
}

/* =====================================================
REQUIREMENTS

Model:
- [x] Has data
- [x] Handles events synchronously and makes batch changes
      to the data
- [x] Transitions and Conditional transitions
- [x] Can have children
- [x] Has a scheduler
- [x] Perform actions based on events
- [x] Can emit events
- [x] State node can have entry and exit handlers
- [x] Processes events per state
- [x] Serializable
- [x] Invokes promises, observables per state or lifecycle
- [x] Has lifecycle events: complete event
- [x] Delayed events
- [x] Error channel; propagating errors
- [x] Snapshots for debugging
- [x] "Always" eventless transitions
- [x] Restoring from persitence snapshot
- [x] Should restore without running entry effects
===================================================== */

export abstract class ComponentModel<
  Data extends AnyModelData = AnyModelData,
  E extends Event = { type: string },
  Emitted extends Event = { type: string },
  DoneData = unknown,
> implements Model<Data, E, Emitted, DoneData> {
  /** Define child in a model when you need it to be serializable with children models. */
  static childTypes: ChildTypes = {};

  /** Reactive data  */
  data: Store<Data>;

  state: Accessor<string>;

  /** Error that caused stopping the machine with `error` status */
  error?: Error;

  readonly send: SendApi<E>;

  status: Status = "idle";

  doneData?: DoneData;

  _id = crypto.randomUUID();

  logging = true;

  constructor(ctx: Data) {
    const [store, setData] = createStore(ctx);
    this.data = store;

    this.setData = protectMethod((...args: unknown[]) => {
      //TODO: decide how to deal with this
      // if (this.status !== 'active') return this.__warnNonActiveModel(`Can't set data for a`);
      // @ts-ignore
      setData(...args);
    }, "setData");

    this.__queue = new Queue();
    this.send = this.__createSendApi();
    const stateChartSetup = (
      this.constructor as ModelConstructor<
        Model<Data, E, Emitted, DoneData>,
        E | InternalEvent
      >
    ).chart;
    if (stateChartSetup) {
      const [state, setState] = createSignal("");
      this.state = state;
      this.__stateSetter = setState;
      this.stateChart = stateChartSetup.createRuntime(this);
    } else {
      this.__stateSetter = NOOP_STATE_SETTER;
      this.state = STATELESS;
    }
  }

  static configure(config: Partial<FrameworkConfig>) {
    Object.assign(this.defaults, config);
  }

  static fromJSON<TThis extends new (...args: unknown[]) => AnyComponentModel>(
    this: TThis,
    snapshot: unknown
  ): InstanceType<TThis> {
    const ctor = this as unknown as ComponentModelConstructor;
    if (!ctor.isModelSnapshot(snapshot))
      throw Error(`${snapshot} is not a model's snapshot.`);
    return ctor.__fromSnapshot(snapshot) as InstanceType<TThis>;
  }

  static fromPersistedSnapshot<
    // Constructor constraint that doesn't care about its parameters, because
    // the constructor arguments isn't actually used in the method, it's just for typing.
    // Or else using fromPersistedSnapshot will yell.
    TThis extends abstract new (...args: never[]) => AnyComponentModel,
  >(this: TThis, snapshot: unknown): InstanceType<TThis> {
    const ctor = this as unknown as ComponentModelConstructor;
    const machine = ctor.fromJSON(snapshot) as InstanceType<TThis>;
    (machine as AnyComponentModel).applyPersistedSnapshot(snapshot);
    return machine;
  }

  /**
   * Override method to apply extra fields from a persisted snapshot to `this`.
   * It should be inversia of `getPersistedSnapshot` method.
   *
   * By default this method does nothing.
   *
   * @example
   * ```ts
   * protected applyPersistedSnapshot(snapshot: any) {
   *   this.__customProp = snapshot.customProp;
   * }
   * ```
   */
  protected applyPersistedSnapshot(snapshot: unknown): void {
    void snapshot;
  }

  on<T extends EventType<Emitted>>(
    type: T,
    handler: (event: Extract<Emitted, { type: T }>) => void
  ): Unsubscribable {
    if (!this.__emittedEvents$) this.__emittedEvents$ = new Subject<Emitted>();
    return this.__emittedEvents$.subscribe({
      next(ev) {
        if ("type" in ev && ev.type === type)
          handler(ev as Extract<Emitted, { type: T }>);
      },
    });
  }

  waitFor(matcher: (snapshot: Snapshot<string, Data>) => boolean) {
    return new Promise<void>((resolve, reject) => {
      const subscription = this.snapshots$.subscribe({
        next(value) {
          if (matcher(value)) {
            subscription.unsubscribe();
            resolve();
          }
        },
        error(err) {
          subscription.unsubscribe();
          reject(err);
        },
      });
    });
  }

  subscribe(
    observer: Partial<Observer<Snapshot<string, Data>>>
  ): Unsubscribable {
    return this.snapshots$.subscribe(observer);
  }

  // For interop with RxJs
  [Symbol.observable]() {
    return this;
  }

  // For older versions of RxJs
  ["@@observable"]() {
    return this;
  }

  dispatch(event: E): void {
    event = unwrap(event);
    if (this.status !== "active")
      return this.__warnNonActiveModel(`Can't dispatch "${event.type}" for a`);
    untrack(() => {
      this.__handleEvent(event);
    });
  }

  toJSON(): Snapshot<string, Data> {
    return untrack(() => {
      return this.__jsonModel(this);
    });
  }

  /**
   * Redefine method if you need additional fields in the model:
   * - call this.toJSON() — it will return a snapshot, you can modify it safely;
   * - add fields using Object.assign method;
   * - return the result.
   */
  getPersistedSnapshot(): unknown {
    return this.toJSON();
  }

  start() {
    if (this.status !== "idle")
      return this.__warnNonActiveModel(`Can't start a`);

    this.__startHandlingFx();
    // TODO: Should parent, or its children start first?
    untrack(() => {
      this.__findAndStartChildren(this.data);
    });
    this.__finishHandlingFx();

    this.status = "active";
    aliveModels.set(this._id, this);
    if (!actionsExecutionStack.isEmpty()) {
      // Set this as a child to a model in which action execution context this model starts
      const parent = actionsExecutionStack.peek()!;
      const children = modelChildrenMap.get(parent._id) || [];
      children.push(this);
      this.parent = parent;
      modelChildrenMap.set(parent._id, children);
    }
    if (this.stateChart) {
      untrack(() => {
        const target = this.state(); // can be any state if node restored from snapshot
        if (target !== "") this.__stateSetter(""); // to make sure a model'll enter all state nodes in a hierarchial state
        this.__executeEventHandler(
          { type: InternalEventName.Start },
          { target, reenter: this.state() !== "" }
        );
      });
    }
  }

  stop() {
    if (this.status !== "active")
      return this.__warnNonActiveModel(`Can't stop a`);
    this.status = "stopped";
    this.__destroy();
    this.__snapshots$?.complete();
  }

  /* ====================== Sub-classes API ====================== */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare protected parent?: any;

  @protectedMethod
  protected invokeObservable<Next>(
    observable: (signal: AbortSignal) => Observable<Next>,
    handler: {
      next?: Transition<
        ComponentModel<Data, E, Emitted, DoneData>,
        InvokedNext<Next>
      >;
      error?: Transition<
        ComponentModel<Data, E, Emitted, DoneData>,
        InvokedError
      >;
      complete?: Transition<
        ComponentModel<Data, E, Emitted, DoneData>,
        InvokedDone<undefined>
      >;
    }
  ) {
    if (this.status !== "active")
      return this.__warnNonActiveModel(`Can't invoke observable for a`);
    const state = this.state();
    this.__invoke(({ signal }) => {
      const sub = observable(signal).subscribe({
        next: value => {
          if (handler.next) allowNextEnqueue = true;
          this.enqueue(() => {
            this.__executeEventHandler(
              { type: InternalEventName.InvokedNext, value, state },
              handler.next as Transition<
                ComponentModel<Data, E, Emitted, DoneData>,
                InvokedNext
              >
            );
          });
        },
        error: error => {
          if (handler.error) {
            allowNextEnqueue = true;
            this.enqueue(() => {
              this.__executeEventHandler(
                { type: InternalEventName.InvokedError, error, state },
                handler.error as Transition<
                  ComponentModel<Data, E, Emitted, DoneData>,
                  InvokedError
                >
              );
            });
          } else {
            this.__machineMalformedInRuntime(
              new MachineMalformed(
                `unhandled error in observable in "${state}"`,
                { cause: error, machineConfig: this.constructor }
              ),
              true
            );
            return;
          }
        },
        complete: () => {
          if (handler.complete) allowNextEnqueue = true;
          this.enqueue(() => {
            this.__executeEventHandler(
              {
                type: InternalEventName.InvokedDone,
                result: undefined,
                state,
              },
              handler.complete as Transition<
                ComponentModel<Data, E, Emitted, DoneData>,
                InvokedDone
              >
            );
          });
        },
      });
      signal.addEventListener("abort", () => {
        sub.unsubscribe();
      });
    });
  }

  @protectedMethod
  protected invokePromise<T>(
    promise: (signal: AbortSignal) => Promise<T>,
    params: {
      onDone:
        | Transition<ComponentModel<Data, E, Emitted, DoneData>, InvokedDone<T>>
        | Transition<
            ComponentModel<Data, E, Emitted, DoneData>,
            InvokedDone<T>
          >[];
      onError?: Transition<
        ComponentModel<Data, E, Emitted, DoneData>,
        InvokedError
      >;
    }
  ) {
    if (this.status !== "active")
      return this.__warnNonActiveModel(`Can't invoke promise for a`);
    const state = this.state();
    this.__invoke(async ({ signal }) => {
      try {
        const result = await promise(signal);
        const event = { type: InternalEventName.InvokedDone, result, state };
        const handler = this.__getOnDoneHandler(
          Array.isArray(params.onDone) ? params.onDone : [params.onDone],
          state,
          event
        );
        if (!handler || handler instanceof MachineMalformed) {
          return this.__machineMalformedInRuntime(
            handler ||
              new MachineMalformed(`error in state "${state}"`, {
                cause: "No onDone handler found",
                machineConfig: this.constructor,
              })
          );
        } else if (handler instanceof Error)
          return this.__toErrorWithReason(handler);

        if (!signal.aborted)
          this.__executeEventHandler(
            event,
            handler as Transition<
              ComponentModel<Data, E, Emitted, DoneData>,
              InvokedDone
            >
          );
      } catch (error) {
        if (error instanceof MachineMalformed) {
          this.__machineMalformedInRuntime(error);
          return;
        }
        if (params.onError) {
          if (!signal.aborted)
            this.__executeEventHandler(
              { type: InternalEventName.InvokedError, error, state },
              params.onError as Transition<
                ComponentModel<Data, E, Emitted, DoneData>,
                InvokedError
              >
            );
        } else {
          const malformedErr = new MachineMalformed(
            `unhandled promise rejection in "${state}"`,
            { cause: error, machineConfig: this.constructor }
          );
          this.__machineMalformedInRuntime(malformedErr);
        }
      }
    });
  }

  @protectedMethod
  protected emit(event: Emitted) {
    event = unwrap(event);
    if (this.status !== "active")
      return this.__warnNonActiveModel(`Can't emit "${event.type}" in a`);
    this.enqueue(() => {
      this.__emittedEvents$?.next(event);
    });
  }

  /** Define this method in a subclass if you need additional cleanup. */
  protected onCleanup() {}

  // protected dynamically
  protected setData: SetStoreFunction<Data>;

  @protectedMethod
  protected schedule(
    handler: Transition<
      ComponentModel<Data, E, Emitted, DoneData>,
      ScheduledExecute
    > & { after?: number }
  ): void {
    if (this.status !== "active")
      return this.__warnNonActiveModel(`Can't schedule in a`);
    if (!this.__scheduler) this.__scheduler = new Scheduler();
    this.__scheduler.schedule(
      () => {
        this.__executeEventHandler(
          { type: InternalEventName.ScheduledExecute, state: this.state() },
          handler
        );
      },
      handler.after || 0,
      this.state()
    );
  }

  @protectedMethod
  protected enqueue(task: () => void, parentSpan?: Span) {
    void parentSpan; //TODO: return tracing
    if (this.status !== "active")
      return this.__warnNonActiveModel(`Can't enque in a`);
    this.__queue.enqueue(task);
    if (
      allowNextEnqueue &&
      (actionsExecutionStack.isEmpty() || actionsExecutionStack.peek() !== this)
    ) {
      // It should be handled async when model in stable state.
      // Usually it's an event sent to the models.
      allowNextEnqueue = false;
      queueMicrotask(() => {
        this.__processQueue(this.state(), "event");
      });
    }
    allowNextEnqueue = false;
  }

  protected get logger(): Logger | undefined {
    if (this.logging) return this.__logger ?? ComponentModel.defaults.logger;
  }

  protected set logger(logger: Logger | null) {
    this.__logger = logger || undefined;
  }

  protected get tracer(): Tracer | undefined {
    return this.__tracer ?? ComponentModel.defaults.tracer;
  }

  protected set tracer(tracer: Tracer | null) {
    this.__tracer = tracer || undefined;
  }

  /* ====================== Private ====================== */

  /* ----------------------- Deps ------------------------ */

  // Lazily created
  private __scheduler: Scheduler | null = null;

  private __queue: Queue;

  private __stateSetter: Setter<string>;

  /* ---------------------- State Data ----------------------- */

  // Lazily created
  private __invocations: Map<string, Set<Invoked>> | null = null;

  private __restored = false;

  /* ---------------------- Events ----------------------- */

  // Lazily created
  private __emittedEvents$: Subject<Emitted> | null = null;

  private __snapshots$: Subject<Snapshot<string, Data>> | null = null;

  get snapshots$(): Subject<Snapshot<string, Data>> {
    if (!this.__snapshots$)
      this.__snapshots$ = new Subject<Snapshot<string, Data>>();
    // Catch-up notificaion: error or completion, for late subscribers
    queueMicrotask(() => {
      if (this.status === "error") {
        this.__snapshots$!.error(this.error);
      } else if (this.status == "done" || this.status === "stopped") {
        this.__snapshots$!.complete();
      }
    });
    return this.__snapshots$;
  }

  /* ----------------------------------------------------- */

  private readonly stateChart?: Interpreter<
    Model<Data, E, Emitted, DoneData>,
    E | InternalEvent
  >;

  private static defaults: FrameworkConfig = {};

  private __addInvoked(state: string, invoked: Invoked) {
    if (!this.__invocations)
      this.__invocations = new Map<string, Set<Invoked>>();
    const set = this.__invocations.get(state) || new Set();
    set.add(invoked);
    this.__invocations.set(state, set);
  }

  private __removeInvoked(state: string, invoked: Invoked) {
    const set = this.__invocations!.get(state);
    if (!set) return;
    set.delete(invoked);
    if (set.size === 0) this.__invocations!.delete(state);
  }

  private __getOnDoneHandler<T>(
    handlers: Transition<
      ComponentModel<Data, E, Emitted, DoneData>,
      InvokedDone<T>
    >[],
    foundPath: string,
    event?: InvokedDone<T>
  ):
    | Transition<ComponentModel<Data, E, Emitted, DoneData>, InvokedDone<T>>
    | Error
    | undefined {
    let handler:
      | Transition<ComponentModel<Data, E, Emitted, DoneData>, InvokedDone<T>>
      | undefined = undefined;
    for (let i = 0; i < handlers.length; i++) {
      handler = handlers[i];
      if (handler.guard) {
        // There is no event for guard inside entry/exit effects.
        try {
          if (
            handler.guard.call(
              this as ComponentModel<Data, E, Emitted, DoneData>,
              event as never
            )
          )
            return handler;
        } catch (error: unknown) {
          return new MachineMalformed(
            `error in guard in state "${foundPath}"`,
            { cause: error, machineConfig: this.constructor }
          );
        }
      } else return handler;
    }
  }

  private __invoke(effect: InvokeParams<E>) {
    if (this.status !== "active")
      return this.__warnNonActiveModel(`Can't invoke for a`);
    const controller = new AbortController();

    const invocation = {
      controller,
      cleanup: undefined as (() => void) | undefined,
    };

    const state = this.state();
    this.__addInvoked(state, invocation);

    Promise.resolve(
      effect({
        signal: controller.signal,
        send: event => {
          if (!controller.signal.aborted) {
            this.dispatch(event);
          }
        },
      })
    )
      .then(cleanup => {
        if (typeof cleanup === "function") {
          if (controller.signal.aborted) {
            cleanup();
          } else {
            invocation.cleanup = cleanup;
          }
        }
      })
      .catch(e => {
        throw e;
      });

    /** Cleanup function  */
    return () => {
      controller.abort();
      invocation.cleanup?.();
      this.__removeInvoked(state, invocation);
    };
  }

  private __toErrorWithReason(err: Error) {
    this.status = "error";
    this.__destroy();
    this.error = err;
    this.__logError("err", err);
    console.error(err);
    this.__snapshots$?.error(err);
  }

  private __machineMalformedInRuntime(err: MachineMalformed, async?: boolean) {
    this.__toErrorWithReason(err);
    if (actionsExecutionStack.peek() === this) actionsExecutionStack.pop();
    if (!async) throw err;
    queueMicrotask(() => {
      // To avoid catching it by internals, e.g. in observable
      throw err;
    });
  }

  private __destroy(): void {
    aliveModels.delete(this._id);
    this.__queue.flush();
    if (this.__invocations)
      for (const [state] of this.__invocations) {
        this.__stopInvocations(state);
      }
    // TODO: potential bug, need to check if scheduled in deep state are stopped
    this.__stopScheduled("");
    const spawned = modelChildrenMap.get(this._id);
    if (spawned) {
      for (let i = 0; i < spawned.length; i++) {
        spawned[i].stop();
      }
      modelChildrenMap.delete(this._id);
    }
    if (actionsExecutionStack.size > 0) {
      // Set this as a child to a model in which action execution context this model starts
      const parentID = actionsExecutionStack.peek()!._id;
      const children = modelChildrenMap.get(parentID);
      if (!children) return;
      const idx = children.findIndex(m => m === this);
      if (idx > -1) children.splice(idx, 1);
    }
    if (this.onCleanup) this.onCleanup();
  }

  private __stopScheduled(state: string) {
    // For top state node or for model without state chart state name is "".
    this.__scheduler?.flush(state);
  }

  private __stopInvocations(state: string) {
    const set = this.__invocations?.get(state);
    if (!set) return;
    for (const stop of [...set]) {
      stop.controller.abort();
      stop.cleanup?.();
      this.__invocations?.delete(state);
    }
  }

  private __handleEvent(event: E): void {
    if (this.status !== "active")
      return this.__warnNonActiveModel(`Can't handle "${event.type}" in a`);
    const handler = this.stateChart!.getMostSpecificHandler(
      this.state(),
      event
    );
    if (!handler) return;
    if (handler instanceof Error) return this.__toErrorWithReason(handler);
    this.__executeEventHandler(
      event,
      handler as Transition<
        ComponentModel<Data, E, Emitted, DoneData>,
        E | InternalEvent
      >
    );
  }

  private __internalEventToTracer(event: InternalEvent) {
    switch (event.type) {
      case InternalEventName.InvokedDone:
        return { type: event.type, result: String(event.result) };
      case InternalEventName.InvokedError:
        return { type: event.type, error: String(event.error) };
      case InternalEventName.InvokedNext:
        return { type: event.type, error: String(event.value) };
      default:
        return { ...event };
    }
  }

  private __isInternalEvent(event: E | InternalEvent): event is InternalEvent {
    return event.type.startsWith("@");
  }

  /** The main cycle of handling event or eventless transitions. */
  private __executeEventHandler<TEvent extends E | InternalEvent>(
    event: TEvent,
    transition: Transition<ComponentModel<Data, E, Emitted, DoneData>, TEvent>
  ): void {
    if (this.status !== "active")
      return this.__warnNonActiveModel(`Can't handle "${event.type}" in a`);
    const span = this.__startTrace(
      `Event`,
      this.__isInternalEvent(event)
        ? this.__internalEventToTracer(event)
        : { ...event }
    );
    this.__logGroup();
    this.__logEvent(event);

    // Event Effect runs before transition effects
    allowNextEnqueue = true;
    if (transition?.action) this.enqueue(transition.action.bind(this, event));

    // Running queued effects
    if (this.__queue.size > 0) this.__processQueue(this.state(), "event");

    // Make a transition by microsteps, executing Entry, Exit effects
    if (transition?.target != null) {
      // Prevents changes of the state signal during transition
      // to cause immediate reactive computations
      batch(() => {
        this.__transitionStepByStep(
          this.stateChart!.transition(
            this.state(),
            transition.target!,
            transition.reenter
          ),
          event
        );
      });
    }

    const state = this.state();

    // Check `always` event if the state has changed from handling previous `always` event.
    const isTheSameAlwaysEffect =
      event.type === InternalEventName.Eventless &&
      (event as Eventless).state === state;

    if (!isTheSameAlwaysEffect) {
      // Eventless transition (Always)
      const always = this.stateChart?.getMostSpecificHandler(state) as
        Transition<Model<Data, E, Emitted, DoneData>, Eventless> | undefined;
      if (always && always instanceof Error) {
        this.__toErrorWithReason(always);
      } else if (always)
        this.__executeEventHandler(
          { type: InternalEventName.Eventless, state: state },
          always
        );
    }

    if (span) span.end();
    this.__logGroupEnd();

    // Emit snapshots to subscribers if there are any.
    this.__snapshots$?.next(this.toJSON());
  }

  private __startHandlingFx() {
    actionsExecutionStack.push(this);
  }

  private __finishHandlingFx() {
    actionsExecutionStack.pop();
  }

  private __transitionStepByStep(
    generator: Generator<
      TransitionStep<Model<Data, E, Emitted, DoneData>, E | InternalEvent>
    >,
    event: E | InternalEvent,
    parentSpan?: Span
  ) {
    const initial = this.state();
    for (const step of generator) {
      if (step.exit) {
        // exit action
        const effect = step.effect;
        const span =
          effect &&
          this.__startSpan("Exit", {
            parent: parentSpan?.context(),
            attributes: { state: step.path },
          });

        if (effect) {
          allowNextEnqueue = true;
          this.enqueue(effect.bind(this, event));
        }

        this.__stopInvocations(step.path);
        this.__stopScheduled(step.path);

        // Running Queued effects
        if (this.__queue.size > 0) this.__processQueue(initial, "exit");

        span?.end();

        this.__stateSetter(step.path);
      } else {
        this.__stateSetter(step.path);
        const effect = step.effect;
        const span =
          effect &&
          this.__startSpan("Entry", {
            parent: parentSpan,
            attributes: { state: step.path },
          });

        if (effect && !this.__restored) {
          allowNextEnqueue = true;
          this.enqueue(effect.bind(this, event));
        }

        // Running Queued effects
        if (this.__queue.size > 0) this.__processQueue(step.path, "entry");

        if (step.invoke) {
          this.__handleInvoke(step.invoke);
        }

        if (step.schedule) {
          this.__handleSchedules(step.schedule, step.path);
        }

        span?.end();
      }
    }
    this.__logTransitoin(initial, this.state());
  }

  private __handleSchedules(
    toSchedule: {
      [key: number]: Transition<
        ComponentModel<Data, E, Emitted, DoneData>,
        ScheduledExecute
      >;
    },
    state: string
  ) {
    for (const timeout in toSchedule) {
      if (!Object.hasOwn(toSchedule, timeout)) continue;
      let num = 0;
      try {
        num = Number.parseInt(timeout);
      } catch (error) {
        throw new MachineMalformed(
          `wrong "after" config in state "${state}", keys shoud be integers`
        );
      }

      const transition = toSchedule[timeout];
      this.schedule({
        after: num,
        ...transition,
      });
    }
  }

  private __handleInvoke(
    invoke: InvokeConfig<ComponentModel<Data, E, Emitted, DoneData>>
  ) {
    if ("promise" in invoke) {
      this.invokePromise(invoke.promise.bind(this), {
        onDone: invoke.onDone,
        onError: invoke.onError,
      });
    } else if ("observable" in invoke) {
      this.invokeObservable(invoke.observable, {
        next: invoke.next,
        error: invoke.error,
        complete: invoke.complete,
      });
    } else throw new MachineMalformed("wrong `invoke` config — unknown type.");
  }

  private __processQueue(state: string, type: "entry" | "exit" | "event") {
    let fn = this.__queue.dequeue();
    if (!fn) return;
    this.__startHandlingFx();
    untrack(() =>
      batch(() => {
        while (fn) {
          try {
            fn();
          } catch (error) {
            if (error instanceof MachineMalformed) {
              this.__machineMalformedInRuntime(error);
              return;
            }
            // Errors in effects do not stop the machine and do not prevent transitions
            const err = new EffectFailed(
              `${type} effect in "${state}" state failed`,
              { cause: error }
            );
            this.__logError("err", err);
            console.error(err);
          }
          fn = this.__queue.dequeue();
        }
      })
    );
    this.__finishHandlingFx();
  }

  private __createSendApi(): SendApi<E> {
    return new Proxy({} as SendApi<E>, {
      get: (_, type: string) => {
        return (payload?: object) => {
          this.dispatch({
            type,
            ...(payload ?? {}),
          } as E);
        };
      },
    });
  }

  /* ----------------------- Serialzation & Snapshots ----------------------- */

  private __jsonModel(
    value: AnyComponentModel,
    name: string = this.constructor.name
  ): Snapshot<string, Data> {
    return {
      _id: value._id,
      state: value.state(),
      name: name,
      data: value.__jsonData(unwrap(value.data), this) as Data,
      status: value.status,
    };
  }

  private __getChildName(
    children: ChildTypes,
    constructor: ModelCtorWithChildren
  ) {
    for (const key in children) {
      if (!Object.hasOwn(children, key)) continue;
      const element = children[key];
      if (element === constructor) return key;
    }
  }

  private __jsonData(value: unknown, owner: AnyComponentModel): unknown {
    if (value instanceof ComponentModel) {
      const parentsConstructor = (value.parent as AnyComponentModel)
        .constructor as ModelCtorWithChildren;
      const childObject = parentsConstructor.childTypes;
      const ctor = value.constructor as ModelCtorWithChildren;
      const name = this.__getChildName(childObject, ctor);
      if (!name) throw new Error(`Can't find a child to spawn a model`);
      return value.__jsonModel(value, name);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.__jsonData(item, owner));
    }

    if (value && typeof value === "object" && value !== null) {
      if (hasToJSON(value)) {
        return value.toJSON();
      }

      const result: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(value)) {
        result[k] = this.__jsonData(v, owner);
      }

      return result;
    }

    return value as unknown;
  }

  /* ------------------------------ Restoring ------------------------------ */

  private __initialize(ctx: Data) {
    const [store, setData] = createStore(ctx);
    this.data = store;

    this.setData = protectMethod((...args: unknown[]) => {
      //TODO: decide how to deal with this
      // if (this.status !== 'active') return this.__warnNonActiveModel(`Can't set data for a`);
      // @ts-ignore
      setData(...args);
    }, "setData");

    this.__queue = new Queue();
    // @ts-ignore
    this.send = this.__createSendApi();
    const stateChartSetup = (
      this.constructor as ModelConstructor<
        Model<Data, E, Emitted, DoneData>,
        E | InternalEvent
      >
    ).chart;
    if (stateChartSetup) {
      const [state, setState] = createSignal("");
      this.state = state;
      this.__stateSetter = setState;
      // @ts-ignore
      this.stateChart = stateChartSetup.createRuntime(this);
    } else {
      this.__stateSetter = NOOP_STATE_SETTER;
      this.state = STATELESS;
    }
  }

  private static __fromSnapshot(
    snapshot: Snapshot<string, AnyModelData>,
    ownerCtor?: ModelCtorWithChildren
  ): AnyComponentModel {
    if (this === ComponentModel)
      throw new Error(
        "You need to extend you model from ComponentModel class."
      );
    const name = snapshot.name;

    const ctor = ownerCtor
      ? this.getChildCtor(ownerCtor, name)
      : (this as unknown as ModelCtorWithChildren);

    if (ownerCtor && !ctor)
      throw new Error(
        `Unable to find child constructor "${name}" in ${ownerCtor.name}`
      );

    if (!ctor)
      throw new Error(
        `Unable to find child constructor "${name}" in ${this.name}`
      );

    // TODO: bad, because constructor can setting other props, like dependencies.
    // const inst: AnyComponentModel = new ctor({}) as AnyComponentModel;
    // UPD: replaced with Object.create, but now avoiding constructor brings its own problems
    const inst: AnyComponentModel = Object.create(
      ctor.prototype
    ) as AnyComponentModel;

    inst.__restored = true;

    const data = this.dataFromJSON(
      snapshot.data,
      ctor as unknown as ModelCtorWithChildren
    );

    actionsExecutionStack.push(inst);
    try {
      inst.__initialize(data);
      inst.__stateSetter(snapshot.state);
      inst._id =
        snapshot._id as `${string}-${string}-${string}-${string}-${string}`;
      inst.status = "idle";
    } catch (error) {
      actionsExecutionStack.pop();
      throw error;
    }
    actionsExecutionStack.pop();
    return inst;
  }

  private static dataFromJSON(
    value: unknown,
    ownerCtor: ModelCtorWithChildren | undefined
  ): unknown {
    if (this.isModelSnapshot(value)) {
      return (this as typeof ComponentModel).__fromSnapshot(value, ownerCtor);
    }

    if (Array.isArray(value)) {
      return value.map(v => this.dataFromJSON(v, ownerCtor));
    }

    if (isClassInstance(value)) {
      return value;
    }

    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(value)) {
        result[k] = this.dataFromJSON(v, ownerCtor);
      }

      return result;
    }

    return value as unknown;
  }

  private static isModelSnapshot(
    value: unknown
  ): value is Snapshot<string, AnyModelData> {
    if (!value || typeof value !== "object" || value === null) return false;

    if (!("data" in value)) return false;
    if (!value.data || typeof value.data !== "object" || value.data === null)
      return false;

    if (!("_id" in value) || typeof value._id !== "string") return false;
    if (!("status" in value) || typeof value.status !== "string") return false;
    if (!("state" in value) || typeof value.state !== "string") return false;

    return true;
  }

  private static getChildCtor(
    constructor: ModelCtorWithChildren,
    name: string
  ): ModelCtorWithChildren | undefined {
    const children = constructor.childTypes;
    if (Object.hasOwn(children, name))
      return children[name] as ModelCtorWithChildren;
  }

  private __findAndStartChildren(value: unknown): unknown {
    if (value instanceof ComponentModel) {
      console.log("child is in", value.status, "status");
      if (value.status === "idle") value.start();
      return;
    }

    if (Array.isArray(value)) {
      return value.map(this.__findAndStartChildren.bind(this));
    }

    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(value)) {
        result[k] = this.__findAndStartChildren(v);
      }
    }
  }

  /* ------------------------------ Logging ------------------------------ */

  private __logger: Logger | undefined;

  private __tracer?: Tracer;

  private __warnNonActiveModel(message: string) {
    console.warn(message + ` model in "${this.status}" status.`);
  }

  private __logTransitoin(from: string, to: string) {
    if (this.logger) this.logger.transition(from, to);
  }

  private __logEvent(event: E | InternalEvent) {
    if (this.logger) this.logger.event(event);
  }

  private __logGroup() {
    if (this.logger) this.logger.group(this.constructor.name, this._id);
  }

  private __logGroupEnd() {
    if (this.logger) this.logger.groupEnd();
  }

  private __logError(message: string, err: Error) {
    if (this.logger) this.logger.error(message, { cause: err });
  }

  /* ------------------------------ Tracing ------------------------------ */

  private __startSpan(
    ...args: Parameters<Tracer["startSpan"]>
  ): Span | undefined {
    if (this.tracer) return this.tracer.startSpan(...args);
  }

  private __startTrace(
    ...args: Parameters<Tracer["startTrace"]>
  ): Span | undefined {
    if (this.tracer) return this.tracer.startTrace(...args);
  }
}

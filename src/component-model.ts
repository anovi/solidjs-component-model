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
===================================================== */

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
  type Invoke,
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
import { EffectFailed } from "./errors";
import type { Model } from "./interfaces";
import { Stack } from "./stack";

type SendApi<E extends { type: string }> = {
  [K in EventName<E>]: (
    payload?: Omit<Extract<E, { type: K }>, "type">
  ) => void;
};

interface ModelConstructor<TModel extends AnyModel, E extends Event> {
  new (...args: any[]): AnyComponentModel;
  chart?: StateChart<TModel, E>;
}

interface ModelCtorWithChildren {
  new (...args: any[]): AnyComponentModel;
  childTypes: ChildTypes;
}

interface ComponentModelConstructor {
  new (...args: any[]): AnyComponentModel;
  isModelSnapshot: (value: unknown) => boolean;
  fromSnapshot: (
    snapshot: unknown,
    ownerCtor?: ModelCtorWithChildren
  ) => AnyComponentModel;
  fromJSON: <Model extends AnyComponentModel>(snapshot: unknown) => Model;
}

type AnyModelConstructor = ModelConstructor<AnyModel, Event>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponentModel = ComponentModel<any, any, any, any>;

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
    this.enqueue(() => {
      originalMethod.apply(this, args);
    });
  };

  return descriptor;
}

export abstract class ComponentModel<
  Data extends AnyModelData = AnyModelData,
  E extends Event = { type: string },
  Emitted extends Event = { type: string },
  DoneData = unknown,
> implements Model<Data, E, Emitted, DoneData> {
  static childTypes: ChildTypes = {};

  data: Store<Data>;

  state: Accessor<string>;

  /** Error that caused stopping the machine with `error` status */
  error?: Error;

  readonly send: SendApi<E>;

  status: Status = "idle";

  doneData?: DoneData;

  _id = crypto.randomUUID();

  constructor(ctx: Data) {
    const [store, setData] = createStore(ctx);
    this.data = store;
    this.setData = (...args: any[]) => {
      //TODO: decide how to deal with this
      // if (this.status !== 'active') return this.#warnNonActiveModel(`Can't set data for a`);
      // @ts-ignore
      setData(...args);
    };
    this.#queue = new Queue();
    this.send = this.#createSendApi();
    const stateChartSetup = (
      this.constructor as ModelConstructor<
        Model<Data, E, Emitted, DoneData>,
        E | InternalEvent
      >
    ).chart;
    if (stateChartSetup) {
      const [state, setState] = createSignal("");
      this.state = state;
      this.#stateSetter = setState;
      this.stateChart = stateChartSetup.createRuntime(this);
    } else {
      this.#stateSetter = NOOP_STATE_SETTER;
      this.state = STATELESS;
    }
  }

  static configure(config: Partial<FrameworkConfig>) {
    Object.assign(this.defaults, config);
  }

  static fromJSON<TThis extends new (...args: any[]) => AnyComponentModel>(
    this: TThis,
    snapshot: unknown
  ): InstanceType<TThis> {
    const ctor = this as unknown as ComponentModelConstructor;
    if (!ctor.isModelSnapshot(snapshot))
      throw Error(`${snapshot} is not a model's snapshot.`);
    return ctor.fromSnapshot(snapshot) as InstanceType<TThis>;
  }

  static fromPersistedSnapshot<
    TThis extends new (...args: any[]) => AnyComponentModel,
  >(this: TThis, snapshot: unknown): InstanceType<TThis> {
    const ctor = this as unknown as ComponentModelConstructor;
    const machine = ctor.fromJSON(snapshot) as InstanceType<TThis>;
    (machine as AnyComponentModel).applyPersistedSnapshot(snapshot);
    return machine;
  }

  /** Override to apply extra fields from a persisted snapshot to `this`. */
  protected applyPersistedSnapshot(_snapshot: unknown): void {
    // no-op by default
  }

  on<T extends EventType<Emitted>>(
    type: T,
    handler: (event: Extract<Emitted, { type: T }>) => void
  ): Unsubscribable {
    if (!this.#emittedEvents$) this.#emittedEvents$ = new Subject<Emitted>();
    return this.#emittedEvents$.subscribe({
      next(ev) {
        if ("type" in ev && ev.type === type)
          handler(ev as Extract<Emitted, { type: T }>);
      },
    });
  }

  subscribe(observer: Partial<Observer<Emitted>>): Unsubscribable {
    if (!this.#emittedEvents$) this.#emittedEvents$ = new Subject<Emitted>();
    if (this.status === "error") this.#emittedEvents$.error(this.error);
    if (this.status === "stopped") this.#emittedEvents$.complete();
    return this.#emittedEvents$.subscribe(observer);
  }

  dispatch(event: E): void {
    event = unwrap(event);
    if (this.status !== "active")
      return this.#warnNonActiveModel(`Can't dispatch "${event.type}" for a`);
    this.#handleEvent(event);
  }

  toJSON(): Snapshot<string, Data> {
    return this.#jsonModel(this);
  }

  getPersistedSnapshot(): unknown {
    return this.toJSON();
  }

  start() {
    if (this.status !== "idle")
      return this.#warnNonActiveModel(`Can't start a`);

    this.#startHandlingFx();
    // TODO: Should parent, or its children start first?
    this.#findAndStartChildren(this.data);
    this.#finishHandlingFx();

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
      const target = this.state(); // can be any state if node restored from snapshot
      if (target !== "") this.#stateSetter(""); // to make sure a model'll enter all state nodes in a hierarchial state
      this.#executeEventHandler(
        { type: InternalEventName.Start },
        { target, reenter: this.state() !== "" }
      );
    }
  }

  stop() {
    if (this.status !== "active")
      return this.#warnNonActiveModel(`Can't stop a`);
    this.status = "stopped";
    this.#destroy();
    this.#emittedEvents$?.complete();
  }

  /* ====================== Sub-classes API ====================== */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare protected parent?: any;

  protected invokeObservable<Next>(
    observable: Observable<Next>,
    handler: {
      next?: Transition<ComponentModel<Data, E, Emitted>, InvokedNext<Next>>;
      error?: Transition<ComponentModel<Data, E, Emitted>, InvokedError>;
      complete?: Transition<
        ComponentModel<Data, E, Emitted>,
        InvokedDone<undefined>
      >;
    }
  ) {
    if (this.status !== "active")
      return this.#warnNonActiveModel(`Can't invoke observable for a`);
    const state = this.state();
    this.#invoke(({ signal }) => {
      const sub = observable.subscribe({
        next: value => {
          if (handler.next)
            this.enqueue(() => {
              this.#executeEventHandler(
                { type: InternalEventName.InvokedNext, value, state },
                handler.next as Transition<this, E | InternalEvent>
              );
            });
        },
        error: error => {
          if (handler.error) {
            this.enqueue(() => {
              this.#executeEventHandler(
                { type: InternalEventName.InvokedError, error, state },
                handler.error as Transition<this, E | InternalEvent>
              );
            });
          } else {
            this.#machineMalformedInRuntime(
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
          if (handler.complete)
            this.enqueue(() => {
              this.#executeEventHandler(
                {
                  type: InternalEventName.InvokedDone,
                  result: undefined,
                  state,
                },
                handler.complete as Transition<this, E | InternalEvent>
              );
            });
        },
      });
      signal.addEventListener("abort", () => {
        sub.unsubscribe();
      });
    });
  }

  protected invokePromise<T>(
    promise: (signal: AbortSignal) => Promise<T>,
    params: {
      onDone:
        | Transition<ComponentModel<Data, any, Emitted>, InvokedDone<T>>
        | Transition<ComponentModel<Data, E, Emitted>, InvokedDone<T>>[];
      onError?: Transition<ComponentModel<Data, any, Emitted>, InvokedError>;
    }
  ) {
    if (this.status !== "active")
      return this.#warnNonActiveModel(`Can't invoke promise for a`);
    const state = this.state();
    this.#invoke(async ({ signal }) => {
      try {
        const result = await promise(signal);
        const event = { type: InternalEventName.InvokedDone, result, state };
        const handler = this.#getOnDoneHandler(
          Array.isArray(params.onDone) ? params.onDone : [params.onDone],
          state,
          event
        );
        if (!handler || handler instanceof MachineMalformed) {
          return this.#machineMalformedInRuntime(
            handler ||
              new MachineMalformed(`error in state "${state}"`, {
                cause: "No onDone handler found",
                machineConfig: this.constructor,
              })
          );
        } else if (handler instanceof Error)
          return this.#toErrorWithReason(handler);

        this.#executeEventHandler(event, handler as Transition<this, any>);
      } catch (error) {
        if (error instanceof MachineMalformed) {
          this.#machineMalformedInRuntime(error);
          return;
        }
        if (params.onError) {
          this.#executeEventHandler(
            { type: InternalEventName.InvokedError, error, state },
            params.onError as Transition<this, any>
          );
        } else {
          const malformedErr = new MachineMalformed(
            `unhandled promise rejection in "${state}"`,
            { cause: error, machineConfig: this.constructor }
          );
          this.#machineMalformedInRuntime(malformedErr);
        }
      }
    });
  }

  protected emit(event: Emitted) {
    event = unwrap(event);
    if (this.status !== "active")
      return this.#warnNonActiveModel(`Can't emit "${event.type}" in a`);
    this.enqueue(() => {
      this.#emittedEvents$?.next(event);
    });
  }

  protected onCleanup?: () => void;

  protected setData: SetStoreFunction<Data>;

  protected schedule(
    handler: Transition<this, E | InternalEvent> & { after?: number }
  ): void {
    if (this.status !== "active")
      return this.#warnNonActiveModel(`Can't schedule in a`);
    if (!this.#scheduler) this.#scheduler = new Scheduler();
    this.#scheduler.schedule(
      this.#executeEventHandler.bind(
        this,
        { type: InternalEventName.ScheduledExecute, state: this.state() },
        handler
      ),
      handler.after || 0,
      this.state()
    );
  }

  protected enqueue(task: () => void, parentSpan?: Span) {
    void parentSpan; //TODO: return tracing
    if (this.status !== "active")
      return this.#warnNonActiveModel(`Can't enque in a`);
    this.#queue.enqueue(task);
    if (actionsExecutionStack.isEmpty())
      // Question: Or should do differently?
      // It changes sync how actions are executed
      // when they are enqueued not from an effect
      queueMicrotask(() => {
        this.#processQueue(this.state(), "event");
      });
  }

  protected get logger(): Logger | undefined {
    return this.#logger ?? ComponentModel.defaults.logger;
  }
  protected set logger(logger: Logger | null) {
    this.#logger = logger || undefined;
  }

  protected get tracer(): Tracer | undefined {
    return this.#tracer ?? ComponentModel.defaults.tracer;
  }

  protected set tracer(tracer: Tracer | null) {
    this.#tracer = tracer || undefined;
  }

  /* ====================== Private ====================== */

  /* ----------------------- Deps ------------------------ */

  // Lazily created
  #scheduler: Scheduler | null = null;

  #queue: Queue;

  #stateSetter: Setter<string>;

  /* ---------------------- State Data ----------------------- */

  // Lazily created
  #invocations: Map<string, Set<Invoked>> | null = null;

  /* ---------------------- Events ----------------------- */

  // Lazily created
  #emittedEvents$: Subject<Emitted> | null = null;

  /* ----------------------------------------------------- */

  private readonly stateChart?: Interpreter<
    Model<Data, E, Emitted, DoneData>,
    E | InternalEvent
  >;

  private static defaults: FrameworkConfig = {};

  #addInvoked(state: string, invoked: Invoked) {
    if (!this.#invocations) this.#invocations = new Map<string, Set<Invoked>>();
    const set = this.#invocations.get(state) || new Set();
    set.add(invoked);
    this.#invocations.set(state, set);
  }

  #removeInvoked(state: string, invoked: Invoked) {
    const set = this.#invocations!.get(state);
    if (!set) return;
    set.delete(invoked);
    if (set.size === 0) this.#invocations!.delete(state);
  }

  #getOnDoneHandler(
    handlers: Transition<ComponentModel<Data, any, Emitted>, any>[],
    foundPath: string,
    event?: E | InternalEvent
  ): Transition<ComponentModel<Data, any, Emitted>, any> | Error | undefined {
    let handler:
      Transition<ComponentModel<Data, any, Emitted>, any> | undefined =
      undefined;
    for (let i = 0; i < handlers.length; i++) {
      handler = handlers[i];
      if (handler.guard) {
        // There is no event for guard inside entry/exit effects.
        try {
          if (
            handler.guard.call(
              this as ComponentModel<Data, any, Emitted>,
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

  #invoke(effect: Invoke<E>) {
    if (this.status !== "active")
      return this.#warnNonActiveModel(`Can't invoke for a`);
    const controller = new AbortController();

    const invocation = {
      controller,
      cleanup: undefined as (() => void) | undefined,
    };

    const state = this.state();
    this.#addInvoked(state, invocation);

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
      this.#removeInvoked(state, invocation);
    };
  }

  #toErrorWithReason(err: Error) {
    this.status = "error";
    this.#destroy();
    this.error = err;
    this.#logError("err", err);
    console.error(err);
    this.#emittedEvents$?.error(err);
  }

  #machineMalformedInRuntime(err: MachineMalformed, async?: boolean) {
    this.#toErrorWithReason(err);
    if (actionsExecutionStack.peek() === this) actionsExecutionStack.pop();
    if (!async) throw err;
    queueMicrotask(() => {
      // To avoid catching it by internals, e.g. in observable
      throw err;
    });
  }

  #destroy(): void {
    aliveModels.delete(this._id);
    this.#queue.flush();
    if (this.#invocations)
      for (const [state] of this.#invocations) {
        this.#stopInvocations(state);
      }
    // TODO: potential bug, need to check if scheduled in deep state are stopped
    this.#stopScheduled("");
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

  #stopScheduled(state: string) {
    // For top state node or for model without state chart state name is "".
    this.#scheduler?.flush(state);
  }

  #stopInvocations(state: string) {
    const set = this.#invocations?.get(state);
    if (!set) return;
    for (const stop of [...set]) {
      stop.controller.abort();
      stop.cleanup?.();
      this.#invocations?.delete(state);
    }
  }

  #handleEvent(event: E): void {
    if (this.status !== "active")
      return this.#warnNonActiveModel(`Can't handle "${event.type}" in a`);
    const handler = this.stateChart!.getMostSpecificHandler(
      this.state(),
      event
    );
    if (!handler) return;
    if (handler instanceof Error) return this.#toErrorWithReason(handler);
    this.#executeEventHandler(
      event,
      handler as Transition<this, E | InternalEvent>
    );
  }

  #internalEventToTracer(event: InternalEvent) {
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

  #isNormalEvent(event: E | InternalEvent): event is E {
    return !event.type.startsWith("@");
  }

  /** The main cycle of handling event or eventless transitions. */
  #executeEventHandler(
    event: E | InternalEvent,
    Transition: Transition<this, E | InternalEvent>
  ): void {
    if (this.status !== "active")
      return this.#warnNonActiveModel(`Can't handle "${event.type}" in a`);
    const span = this.#startTrace(
      `Event`,
      this.#isNormalEvent(event)
        ? { ...event }
        : this.#internalEventToTracer(event)
    );
    this.#logGroup();
    this.#logEvent(event);

    // Event Effect runs before transition effects
    if (Transition?.action) this.enqueue(Transition.action.bind(this, event));

    // Running queued effects
    if (this.#queue.size > 0) this.#processQueue(this.state(), "event");

    // Make a transition by microsteps, executing Entry, Exit effects
    if (Transition?.target != null) {
      this.#transitionStepByStep(
        this.stateChart!.transition(
          this.state(),
          Transition.target,
          Transition.reenter
        ),
        event
      );
    }

    const state = this.state();

    // Check `always` event if the state has changed from handling previous `always` event.
    const isTheSameAlwaysEffect =
      event.type === InternalEventName.Eventless &&
      (event as Eventless).state === state;

    if (!isTheSameAlwaysEffect) {
      // Eventless transition (Always)
      const always = this.stateChart?.getMostSpecificHandler(state);
      if (always && always instanceof Error) {
        this.#toErrorWithReason(always);
      } else if (always)
        this.#executeEventHandler(
          { type: InternalEventName.Eventless, state: state },
          always
        );
    }

    if (span) span.end();
    this.#logGroupEnd();
  }

  #startHandlingFx() {
    actionsExecutionStack.push(this);
  }

  #finishHandlingFx() {
    actionsExecutionStack.pop();
  }

  #transitionStepByStep(
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
          this.#startSpan("Exit", {
            parent: parentSpan?.context(),
            attributes: { state: step.path },
          });

        if (effect) this.enqueue(effect.bind(this, event));

        this.#stopInvocations(step.path);
        this.#stopScheduled(step.path);

        // Running Queued effects
        if (this.#queue.size > 0) this.#processQueue(initial, "exit");

        span?.end();

        this.#stateSetter(step.path);
      } else {
        this.#stateSetter(step.path);
        const effect = step.effect;
        const span =
          effect &&
          this.#startSpan("Entry", {
            parent: parentSpan,
            attributes: { state: step.path },
          });

        if (effect) this.enqueue(effect.bind(this, event));

        // Running Queued effects
        if (this.#queue.size > 0) this.#processQueue(step.path, "entry");

        span?.end();
      }
    }
    this.#logTransitoin(initial, this.state());
  }

  #processQueue(state: string, type: "entry" | "exit" | "event") {
    let fn = this.#queue.dequeue();
    if (!fn) return;
    this.#startHandlingFx();
    untrack(() =>
      batch(() => {
        while (fn) {
          try {
            fn();
          } catch (error) {
            if (error instanceof MachineMalformed) {
              this.#machineMalformedInRuntime(error);
              return;
            }
            // Errors in effects do not stop the machine and do not prevent transitions
            const err = new EffectFailed(
              `${type} effect in "${state}" state failed`,
              { cause: error }
            );
            this.#logError("err", err);
            console.error(err);
          }
          fn = this.#queue.dequeue();
        }
      })
    );
    this.#finishHandlingFx();
  }

  #createSendApi(): SendApi<E> {
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

  #jsonModel(
    value: AnyComponentModel,
    name: string = ""
  ): Snapshot<string, Data> {
    return {
      _id: value._id,
      state: value.state(),
      name: name,
      data: value.#jsonData(unwrap(value.data), this) as Data,
      status: value.status,
    };
  }

  #getChildName(children: ChildTypes, constructor: ModelCtorWithChildren) {
    for (const key in children) {
      if (!Object.hasOwn(children, key)) continue;
      const element = children[key];
      if (element === constructor) return key;
    }
  }

  #jsonData(value: unknown, owner: AnyComponentModel): unknown {
    if (value instanceof ComponentModel) {
      const childObject = (
        (value.parent as AnyComponentModel).constructor as ModelCtorWithChildren
      ).childTypes;
      const ctor = value.constructor as ModelCtorWithChildren;
      const name = this.#getChildName(childObject, ctor);
      if (!name) throw new Error(`Can't find a child to spawn a model`);
      return value.#jsonModel(value, name);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.#jsonData(item, owner));
    }

    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(value)) {
        result[k] = this.#jsonData(v, owner);
      }

      return result;
    }

    return value as unknown;
  }

  /* ------------------------------ Restoring ------------------------------ */

  /** Redefine method if you have highly customized model. */
  private static fromSnapshot(
    snapshot: Snapshot<string, AnyModelData>,
    ownerCtor?: ModelCtorWithChildren
  ): AnyComponentModel {
    if (this === ComponentModel)
      throw new Error(
        "You need to extend you model from ComponentModel class."
      );
    const name = snapshot.name;

    let inst: AnyComponentModel;

    const data = (this as typeof ComponentModel).dataFromJSON(
      snapshot.data,
      ownerCtor
    );

    if (ownerCtor) {
      const ctor = (this as typeof ComponentModel).getChildCtor(
        ownerCtor,
        name
      );
      if (!ctor)
        throw new Error(
          `Unable to find child constructor "${name}" in ${ownerCtor}`
        );
      // It does not matter that data is empty, we update it immediately
      inst = new ctor({}) as AnyComponentModel;
    } else {
      // It does not matter that data is empty, we update it immediately
      inst = new (this as unknown as ModelCtorWithChildren)(
        {}
      ) as AnyComponentModel;
    }

    inst.setData(data);
    inst.#stateSetter(snapshot.state);
    inst._id =
      snapshot._id as `${string}-${string}-${string}-${string}-${string}`;
    inst.status = "idle";
    return inst;
  }

  private static dataFromJSON(
    value: unknown,
    ownerCtor: ModelCtorWithChildren | undefined
  ): unknown {
    if (this.isModelSnapshot(value)) {
      return (this as typeof ComponentModel).fromSnapshot(
        value,
        ownerCtor || (this as unknown as ModelCtorWithChildren)
      );
    }

    if (Array.isArray(value)) {
      return value.map(v => this.dataFromJSON(v, ownerCtor));
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

  #findAndStartChildren(value: unknown): unknown {
    if (value instanceof ComponentModel) {
      console.log("child is in", value.status, "status");
      if (value.status === "idle") value.start();
      return;
    }

    if (Array.isArray(value)) {
      return value.map(this.#findAndStartChildren.bind(this));
    }

    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(value)) {
        result[k] = this.#findAndStartChildren(v);
      }
    }
  }

  /* ------------------------------ Logging ------------------------------ */

  #logger: Logger | undefined;

  #tracer?: Tracer;

  #warnNonActiveModel(message: string) {
    console.warn(message + ` model in "${this.status}" status.`);
  }

  #logTransitoin(from: string, to: string) {
    if (this.logger) this.logger.transition(from, to);
  }

  #logEvent(event: E | InternalEvent) {
    if (this.logger) this.logger.event(event);
  }

  #logGroup() {
    if (this.logger) this.logger.group(this.constructor.name, this._id);
  }

  #logGroupEnd() {
    if (this.logger) this.logger.groupEnd();
  }

  #logError(message: string, err: Error) {
    if (this.logger) this.logger.error(message, { cause: err });
  }

  /* ------------------------------ Tracing ------------------------------ */

  #startSpan(...args: Parameters<Tracer["startSpan"]>): Span | undefined {
    if (this.tracer) return this.tracer.startSpan(...args);
  }

  #startTrace(...args: Parameters<Tracer["startTrace"]>): Span | undefined {
    if (this.tracer) return this.tracer.startTrace(...args);
  }
}

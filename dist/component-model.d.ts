import { type Accessor } from "solid-js";
import { type SetStoreFunction, type Store } from "solid-js/store";
import { type Observer, type Observable, type Unsubscribable } from "./observable";
import { type AnyModelData, type EventType, type Snapshot, type FrameworkConfig, type Status, type InvokedNext, type InvokedError, type InvokedDone, type InternalEvent, type AnyModel } from "./types";
import { StateChart, type Event, type EventName, type StateChartConfig, type Transition } from "./state-chart";
import { type Logger } from "./logger";
import type { Span, Tracer } from "./tracer-types";
import { type StatePaths } from "./state-chart/state-path";
import type { Model } from "./interfaces";
type SendApi<E extends {
    type: string;
}> = {
    [K in EventName<E>]: (payload?: Omit<Extract<E, {
        type: K;
    }>, "type">) => void;
};
interface ModelConstructor<TModel extends AnyModel, E extends Event> {
    new (...args: any[]): AnyComponentModel;
    chart?: StateChart<TModel, E>;
}
type AnyModelConstructor = ModelConstructor<AnyModel, Event>;
type AnyComponentModel = ComponentModel<any, any, any, any>;
type ChildTypes = {
    [key: string]: AnyModelConstructor;
};
/**
 * Decorator that wraps a method so its body is enqueued as an effect
 * and the queue is processed. Use on methods in classes extending ComponentModel.
 */
export declare function action(_target: object, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;
export declare abstract class ComponentModel<Data extends AnyModelData = AnyModelData, E extends Event = {
    type: string;
}, Emitted extends Event = {
    type: string;
}, DoneData = unknown> implements Model<Data, E, Emitted, DoneData> {
    #private;
    static childTypes: ChildTypes;
    data: Store<Data>;
    state: Accessor<StatePaths<StateChartConfig<this, E>>>;
    /** Error that caused stopping the machine with `error` status */
    error?: Error;
    readonly send: SendApi<E>;
    status: Status;
    doneData?: DoneData;
    _id: `${string}-${string}-${string}-${string}-${string}`;
    constructor(ctx: Data);
    static configure(config: Partial<FrameworkConfig>): void;
    static fromJSON<TThis extends new (...args: any[]) => AnyComponentModel>(this: TThis, snapshot: unknown): InstanceType<TThis>;
    static fromPersistedSnapshot<TThis extends new (...args: any[]) => AnyComponentModel>(this: TThis, snapshot: unknown): InstanceType<TThis>;
    /** Override to apply extra fields from a persisted snapshot to `this`. */
    protected applyPersistedSnapshot(_snapshot: unknown): void;
    on<T extends EventType<Emitted>>(type: T, handler: (event: Extract<Emitted, {
        type: T;
    }>) => void): Unsubscribable;
    subscribe(observer: Partial<Observer<Emitted>>): Unsubscribable;
    dispatch(event: E): void;
    toJSON(): Snapshot<string, Data>;
    getPersistedSnapshot(): unknown;
    start(): void;
    stop(): void;
    protected parent?: any;
    protected invokeObservable<Next>(observable: Observable<Next>, handler: {
        next?: Transition<ComponentModel<Data, E, Emitted>, InvokedNext<Next>>;
        error?: Transition<ComponentModel<Data, E, Emitted>, InvokedError>;
        complete?: Transition<ComponentModel<Data, E, Emitted>, InvokedDone<undefined>>;
    }): void;
    protected invokePromise<T>(promise: (signal: AbortSignal) => Promise<T>, params: {
        onDone: Transition<ComponentModel<Data, any, Emitted>, InvokedDone<T>> | Transition<ComponentModel<Data, E, Emitted>, InvokedDone<T>>[];
        onError?: Transition<ComponentModel<Data, any, Emitted>, InvokedError>;
    }): void;
    protected emit(event: Emitted): void;
    protected onCleanup?: () => void;
    protected setData: SetStoreFunction<Data>;
    protected schedule(handler: Transition<this, E | InternalEvent>, timeout?: number): void;
    protected enqueue(task: () => void, parentSpan?: Span): void;
    protected get logger(): Logger | undefined;
    protected set logger(logger: Logger | null);
    protected get tracer(): Tracer | undefined;
    protected set tracer(tracer: Tracer | null);
    private readonly stateChart?;
    private static defaults;
    /** Redefine method if you have highly customized model. */
    private static fromSnapshot;
    private static dataFromJSON;
    private static isModelSnapshot;
    private static getChildCtor;
}
export {};
//# sourceMappingURL=component-model.d.ts.map
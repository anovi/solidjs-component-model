/** Context in which actions and guards execute. */
export type ExecutionContext = any;
export type Event = {
    type: string;
};
export type EventName<E> = E extends {
    type: infer T extends PropertyKey;
} ? T : never;
export type TransitionStep<TModel, E extends Event> = {
    path: string;
    exit: boolean;
    final?: boolean;
    effect?: Action<TModel, E>;
};
export type AnyStateChartConfig = StateChartConfig<any, any>;
export type StateChartConfig<TModel, E extends Event> = {
    /** Which child state to enter initially. Is required when the state has child states. */
    initial?: string;
    /** Child states */
    states?: {
        [state: string]: StateChartConfig<TModel, E>;
    };
    type?: 'parallel' | 'final' | 'history';
    /** An entry effect executed when machine enters this state. */
    entry?: Action<TModel, E>;
    /** An exit effect executed just before machine exits this state. */
    exit?: Action<TModel, E>;
    /** Always transition that is checked after handling any other event. */
    always?: HandlerForEvent<TModel, never, never> | HandlerForEvent<TModel, never, never>[];
    /** An object whose keys are event names and values are transitions. */
    on?: {
        [K in EventName<E>]?: HandlerForEvent<TModel, E, K> | HandlerForEvent<TModel, E, K>[];
    };
};
export type Transition<TModel, E extends Event> = {
    target?: string;
    reenter?: boolean;
    guard?: Guard<TModel, E>;
    action?: Action<TModel, E>;
};
export type HandlerForEvent<TModel, E extends Event, T extends EventName<E>> = Transition<TModel, Extract<E, {
    type: T;
}>>;
export type Guard<TModel, E extends Event> = (this: TModel, ev: E) => boolean;
export type AnyAction = Action<unknown, Event>;
export type Action<TModel, E extends Event> = (this: TModel, ev: E) => void;
export type ExtractInstance<T> = [
    T
] extends [abstract new (...args: any[]) => infer R] ? R : [T] extends [new (...args: any[]) => infer R] ? R : T;
//# sourceMappingURL=state-chart-types.d.ts.map
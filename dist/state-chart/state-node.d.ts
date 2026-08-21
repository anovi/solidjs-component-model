import type { Event, Action, HandlerForEvent, EventName } from "./state-chart-types";
export declare enum NodeType {
    parallel = 1,
    final = 2,
    history = 3
}
export type AnyStateNode = StateNode<any, any>;
export type StateNode<TModel, E extends Event> = {
    name: string;
    parent: StateNode<TModel, E> | null;
    initial?: StateNode<TModel, E>;
    children?: {
        [state: string]: StateNode<TModel, E>;
    };
    type?: NodeType;
    entry?: Action<TModel, E>;
    exit?: Action<TModel, E>;
    always?: HandlerForEvent<TModel, never, never>[];
    on?: {
        [K in EventName<E>]?: HandlerForEvent<TModel, E, K>[];
    };
};
//# sourceMappingURL=state-node.d.ts.map
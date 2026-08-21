import type { AnyModel, EventType } from "./types";
import type { Event } from "./state-chart";
import type { Observer, Unsubscribable } from "./observable";
export type EventHandlers<E extends Event> = {
    [K in EventType<E>]?: (event: Extract<E, {
        type: K;
    }>) => void;
};
type HasEvents<E extends Event> = {
    on: (type: EventType<E>, handler: (event: E) => void) => Unsubscribable;
};
type EmittedOf<T> = T extends {
    subscribe: (observer: Partial<Observer<infer E>>) => any;
} ? E : never;
export declare function useModel<M extends new (...args: any[]) => AnyModel>(ctor: M, ...args: ConstructorParameters<M>): InstanceType<M>;
export declare function useModel<M extends new (...args: any[]) => object>(ctor: M, ...args: ConstructorParameters<M>): InstanceType<M>;
/**
 * Subscribe to events with automatic disposal of subscription.
 */
export declare function useEvents<TModel extends HasEvents<EmittedOf<TModel>> & {
    subscribe: (observer: Partial<Observer<any>>) => Unsubscribable;
}>(model: TModel, handlers: EventHandlers<EmittedOf<TModel>>): void;
export {};
//# sourceMappingURL=solidjs.d.ts.map
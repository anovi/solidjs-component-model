import { EventlessSym } from "./symbols";
import type { Event, EventName, Transition } from "./state-chart-types";
/**
 * Stores all transitions of a state chart via state address and event.
*/
export declare class StateEventHandlersMap<E extends Event> {
    #private;
    set(address: string, event: typeof EventlessSym, handlers: Transition<any, never>[]): void;
    set<T extends EventName<E>>(address: string, event: T, handlers: Transition<any, Extract<E, {
        type: T;
    }>>[]): void;
    get(address: string): Map<typeof EventlessSym | EventName<E>, Transition<any, any>[]> | undefined;
    [Symbol.iterator](): Generator<[string, Map<typeof EventlessSym | EventName<E>, Transition<any, any>[]>], void, unknown>;
}
//# sourceMappingURL=state-event-handlers-map.d.ts.map
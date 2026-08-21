import { EventlessSym } from "./symbols";
import { type EventName, type EventNodeHandler } from "./types";
/**
 * Stores all transitions of a state chart via state address and event.
*/
export declare class StateEventHandlersMap<E extends Event> {
    #private;
    set(address: string, event: typeof EventlessSym, handlers: EventNodeHandler<any, never>[]): void;
    set<T extends EventName<E>>(address: string, event: T, handlers: EventNodeHandler<any, Extract<E, {
        type: T;
    }>>[]): void;
    get(address: string): Map<typeof EventlessSym | EventName<E>, EventNodeHandler<any, any>[]> | undefined;
}
//# sourceMappingURL=state-event-handlers-map.d.ts.map
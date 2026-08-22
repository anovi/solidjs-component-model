/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventlessSym } from "./symbols";
import type { Event, EventName, Transition } from "./state-chart-types";

/**
 * Stores all transitions of a state chart via state address and event.
 */
export class StateEventHandlersMap<E extends Event> {
  #map = new Map<
    string,
    Map<EventName<E> | typeof EventlessSym, Transition<any, any>[]>
  >();

  set(
    address: string,
    event: typeof EventlessSym,
    handlers: Transition<any, never>[]
  ): void;

  set<T extends EventName<E>>(
    address: string,
    event: T,
    handlers: Transition<any, Extract<E, { type: T }>>[]
  ): void;

  set(
    address: string,
    event: EventName<E> | typeof EventlessSym,
    handlers: Transition<any, any>[]
  ) {
    let stateMap = this.#map.get(address);

    if (!stateMap) {
      stateMap = new Map();
      this.#map.set(address, stateMap);
    }

    stateMap.set(event, handlers);
  }

  get(address: string) {
    return this.#map.get(address);
  }

  *[Symbol.iterator]() {
    for (const keyValue of this.#map) {
      yield keyValue;
    }
  }
}

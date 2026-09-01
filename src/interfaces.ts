import type { Store } from "solid-js/store";
import { type Unsubscribable, type Observer } from "./observable";

import type { AnyModelData, EventType, Snapshot, Status } from "./types";
import type { Event } from "./state-chart";

export interface Model<
  Data extends AnyModelData = AnyModelData,
  E extends Event = { type: string },
  Emitted extends Event = { type: string },
  DoneData = unknown,
> {
  readonly _id: string;

  data: Store<Data>;

  status: Status;

  /** Error that caused stopping the machine with `error` status */
  error?: Error;

  doneData?: DoneData;

  on: <T extends EventType<Emitted>>(
    type: T,
    handler: (event: Extract<Emitted, { type: T }>) => void
  ) => Unsubscribable;

  /**
   * Returns a promise that resolves when the model's snapshot satisfies the given condition.
   * The promise rejects if the model stops with an error.
   *
   * @param matcher A function evaluated against the model's snapshot whenever it changes.
   * @returns A promise that resolves when `matcher` returns `true`.
   */
  waitFor: (
    matcher: (snapshot: Snapshot<string, Data>) => boolean
  ) => Promise<void>;

  /**
   * Subscribes to the model's snapshot updates and lifecycle events.
   *
   * @param observerOrNext An observer that receives snapshot updates and lifecycle events.
   * @returns An object that can be used to unsubscribe from the subscription.
   */
  subscribe: (
    observerOrNext: Partial<Observer<Snapshot<string, Data>>>
  ) => Unsubscribable;

  dispatch: (event: E) => void;

  toJSON: () => Snapshot<string, AnyModelData>;

  getPersistedSnapshot: () => unknown;

  start: () => void;

  stop: () => void;
}

export interface Loggable {
  warnNonActiveModel: (message: string) => void;

  logTransitoin: (from: string, to: string) => void;

  logEvent: (event: Event) => void;

  logGroup: () => void;

  logGroupEnd: () => void;

  logError: (message: string, err: Error) => void;
}

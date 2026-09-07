/**
 * Event that a component model can receive.
 */
export type Event = { type: string };

export type EventType<E> = E extends { type: infer T } ? T : never;

// Internal Events
export const InternalEventName = {
  InvokedDone: "@done.invoke",
  InvokedError: "@error.invoke",
  InvokedNext: "@next.invoke",
  ScheduledExecute: "@execute.scheduled",
  Eventless: "@always",
  Start: "@start",
} as const;

export type Start = {
  type: typeof InternalEventName.Start;
};
export type Eventless = {
  type: typeof InternalEventName.Eventless;
  state: string;
};
export type InvokedDone<T = unknown> = {
  type: typeof InternalEventName.InvokedDone;
  result: T;
  state: string;
};
export type InvokedError = {
  type: typeof InternalEventName.InvokedError;
  error: unknown;
  state: string;
};
export type InvokedNext<V = unknown> = {
  type: typeof InternalEventName.InvokedNext;
  value: V;
  state: string;
};
export type ScheduledExecute = {
  type: typeof InternalEventName.ScheduledExecute;
  state: string;
};

export type InternalEvent =
  | Start
  | Eventless
  | InvokedNext
  | InvokedDone
  | InvokedError
  | ScheduledExecute;

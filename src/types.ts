import type { Model } from "./interfaces";
import type { Logger } from "./logger";
import type { Tracer } from "./tracer-types";

/* ====================== Model ====================== */

export type AnyModelData = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyModel = Model<any, any, { type: string }, any>;

export type Cleanup = void | (() => void);

export type Invoke<E> = (ctx: {
  signal: AbortSignal;
  send: (event: E) => void;
}) => Cleanup | Promise<Cleanup>;

export type Status = "idle" | "active" | "stopped" | "error" | "done";

export type Snapshot<State extends string, Data extends AnyModelData> = {
  _id: string;
  name: string;
  state: State;
  data: Data;
  status: Status;
};

/* ====================== Framework ====================== */

export interface FrameworkConfig {
  logger?: Logger;
  tracer?: Tracer;
}

/* ====================== Events ====================== */

export type EventType<E> = E extends { type: infer T } ? T : never;

export const InternalEventName = {
  InvokedDone: "@done.invoke",
  InvokedError: "@error.invoke",
  InvokedNext: "@next.invoke",
  ScheduledExecute: "@execute.scheduled",
  Eventless: "@always",
  Start: "@start",
} as const;

export type Start = { type: typeof InternalEventName.Start };
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

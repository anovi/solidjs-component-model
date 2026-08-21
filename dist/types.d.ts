import type { Model } from './interfaces';
import type { Logger } from './logger';
import type { Tracer } from './tracer-types';
export type AnyModelData = Record<string, unknown>;
export type AnyModel = Model<any, any, any, any>;
export type Cleanup = void | (() => void);
export type Invoke<E> = (ctx: {
    signal: AbortSignal;
    send: (event: E) => void;
}) => Cleanup | Promise<Cleanup>;
export type Status = 'idle' | 'active' | 'stopped' | 'error' | 'done';
export type Snapshot<State extends string, Data extends AnyModelData> = {
    _id: string;
    name: string;
    state: State;
    data: Data;
    status: Status;
};
export interface FrameworkConfig {
    logger?: Logger;
    tracer?: Tracer;
}
export type EventType<E> = E extends {
    type: infer T;
} ? T : never;
export declare const InternalEventName: {
    readonly InvokedDone: "@done.invoke";
    readonly InvokedError: "@error.invoke";
    readonly InvokedNext: "@next.invoke";
    readonly ScheduledExecute: "@execute.scheduled";
    readonly Eventless: "@always";
    readonly Start: "@start";
};
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
export type InternalEvent = Start | Eventless | InvokedNext | InvokedDone | InvokedError | ScheduledExecute;
//# sourceMappingURL=types.d.ts.map
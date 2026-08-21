type TimerId = ReturnType<typeof setTimeout>;
export declare class Scheduler {
    #private;
    schedule<V = void>(fn: (() => Promise<V>) | (() => V), timeout: number, tag?: string): TimerId;
    cancel(id: TimerId): void;
    flush(tag?: string): void;
}
export {};
//# sourceMappingURL=scheduler.d.ts.map
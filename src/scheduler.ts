type AnyScheduledFn = () => unknown;

type TimerId = ReturnType<typeof setTimeout>;

export class Scheduler {

    #timers: Map<TimerId, {fn: AnyScheduledFn, tag: string}> = new Map();

    schedule<V = void>(fn: (() => Promise<V>) | (() => V), timeout: number, tag?: string): TimerId {
        const id: TimerId = setTimeout(() => {
            this.#timers.delete(id);
            fn();
        }, timeout);
        this.#timers.set(id, { fn, tag: tag || ''});
        return id;
    }

    cancel(id: TimerId): void {
        this.#timers.delete(id);
        clearTimeout(id);
    }

    flush(tag?: string): void {
        for (const [id, params] of this.#timers) {
            if (!tag || params.tag === tag) {
                clearTimeout(id);
                this.#timers.delete(id);
            }
        }
    }

}
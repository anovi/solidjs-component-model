export interface Unsubscribable {
    unsubscribe: () => void;
}
export interface Subscribable<T> {
    subscribe: (observer: Partial<Observer<T>>) => Unsubscribable;
}
export interface SubscriptionLike extends Unsubscribable {
    readonly closed: boolean;
    unsubscribe: () => void;
}
export interface SubjectLike<T> extends Observer<T>, Subscribable<T> {
}
export type Subscriber<T> = Observer<T>;
export interface Observer<T> {
    next: (value: T) => void;
    error: (err: unknown) => void;
    complete: () => void;
}
export interface Observable<T> extends Subscribable<T> {
    subscribe: (observerOrNext?: Partial<Observer<T>> | ((value: T) => void)) => SubscriptionLike;
}
export declare class Subject<T> implements SubjectLike<T>, SubscriptionLike {
    #private;
    /**
     * It's `closed` when `subject.unsubscribe` were called.
    */
    get closed(): boolean;
    complete(): void;
    next(value: T): void;
    error(error: unknown): void;
    subscribe(observer: Partial<Observer<T>>): Unsubscribable;
    unsubscribe(): void;
    /** @internal */
    protected _throwIfClosed(): void;
}
//# sourceMappingURL=observable.d.ts.map
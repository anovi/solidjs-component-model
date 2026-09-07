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

export interface SubjectLike<T> extends Observer<T>, Subscribable<T> {}

export type Subscriber<T> = Observer<T>;

export interface Observer<T> {
  next: (value: T) => void;
  error: (err: unknown) => void;
  complete: () => void;
}

export interface Observable<T> extends Subscribable<T> {
  subscribe: (
    observerOrNext?: Partial<Observer<T>> | ((value: T) => void)
  ) => SubscriptionLike;
}

const NOOP_SUB: Unsubscribable = {
  unsubscribe: () => undefined,
};

export class Subject<T> implements SubjectLike<T>, SubscriptionLike {
  /**
   * It's `closed` when `subject.unsubscribe` were called.
   */
  get closed() {
    return this.#isClosed;
  }

  complete() {
    this._throwIfClosed();
    if (this.#isComplete) return;
    this.#isComplete = true;
    for (const observer of this.#observers) {
      if (observer.complete) observer.complete();
    }
    this.#observers.clear();
  }

  next(value: T) {
    this._throwIfClosed();
    if (this.#isComplete || this.#hasError) return;
    for (const observer of this.#observers) {
      if (observer.next) observer.next(value);
    }
  }

  error(error: unknown) {
    this._throwIfClosed();
    if (this.#hasError) return;
    this.#hasError = true;
    this.#error = error;
    for (const observer of this.#observers) {
      if (observer.error) observer.error(this.#error);
    }
    this.#observers.clear();
  }

  subscribe(observer: Partial<Observer<T>>): Unsubscribable {
    this._throwIfClosed();

    this.#observers.add(observer);

    if (this.#hasError) {
      if (observer.error) observer.error(this.#error);
      return NOOP_SUB;
    }

    if (this.#isComplete) {
      if (observer.complete) observer.complete();
      return NOOP_SUB;
    }

    return {
      unsubscribe: () => {
        this.#observers.delete(observer);
      },
    };
  }

  unsubscribe() {
    this.#observers.clear();
    this.#isClosed = true;
  }

  // For interop with RxJs
  [Symbol.observable]() {
    return this;
  }

  // For older versions of RxJs
  ["@@observable"]() {
    return this;
  }

  /** @internal */
  protected _throwIfClosed() {
    if (this.#isClosed) throw new Error("Subject is already stopped.");
  }

  #observers = new Set<Partial<Observer<T>>>();
  #isComplete = false;
  #isClosed = false;
  #hasError = false;
  #error: unknown = null;
}

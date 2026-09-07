export class ConsList<T = unknown> implements Iterable<T> {
  static EMPTY: ConsList<never>;

  constructor(value?: T, next?: ConsList<T> | null, size?: number);

  first(): T | undefined;
  rest(): ConsList<T>;
  get size(): number;
  prepend(value?: T): ConsList<T>;

  [Symbol.iterator](): Iterator<T>;
}

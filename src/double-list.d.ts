export interface DoubleListNode<T> {
  value: T;
  prev: DoubleListNode<T> | null;
  next: DoubleListNode<T> | null;
}

export class DoubleList<T = unknown> implements Iterable<T> {
  head: DoubleListNode<T> | null;
  tail: DoubleListNode<T> | null;
  length: number;

  constructor();

  prepend(value: T): this;
  append(value: T): this;
  insert(index: number, value: T): this;
  delete(index: number): this;
  at(index: number): T;
  toArray(): T[];

  [Symbol.iterator](): Generator<T, void, unknown>;
}

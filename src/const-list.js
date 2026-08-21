'use strict';

export class ConsList {
  #value = undefined;
  #next = null;
  #size = 0;

  static EMPTY = new ConsList();

  constructor(value = undefined, next = null, size = 0) {
    this.#value = value;
    this.#next = next;
    this.#size = size;
  }

  first() {
    return this.#value;
  }

  rest() {
    if (this.#next === null) return ConsList.EMPTY;
    return this.#next;
  }

  get size() {
    return this.#size;
  }

  prepend(value = undefined) {
    const next = this.#size === 0 ? null : this;
    return new ConsList(value, next, this.#size + 1);
  }

  [Symbol.iterator]() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current = this;
    return {
      next: () => {
        if (!current || current.#size === 0) {
          return { done: true, value: undefined };
        }
        const value = current.#value;
        current = current.#next;
        return { done: false, value };
      },
    };
  }
}
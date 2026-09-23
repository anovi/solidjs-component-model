import { describe, expect, it } from "vitest";
import { DoubleList, type DoubleListNode } from "./double-list.js";

function expectList<T>(list: DoubleList<T>, values: T[]) {
  expect(list.length).toBe(values.length);
  expect(list.toArray()).toEqual(values);
  expect([...list]).toEqual(values);

  let node = list.head;
  let previous: DoubleListNode<T> | null = null;
  for (const value of values) {
    expect(node).not.toBeNull();
    expect(node!.value).toBe(value);
    expect(node!.prev).toBe(previous);
    previous = node;
    node = node!.next;
  }
  expect(node).toBeNull();
  expect(list.tail).toBe(previous);

  node = list.tail;
  let next: DoubleListNode<T> | null = null;
  for (const value of values.toReversed()) {
    expect(node).not.toBeNull();
    expect(node!.value).toBe(value);
    expect(node!.next).toBe(next);
    next = node;
    node = node!.prev;
  }
  expect(node).toBeNull();
  expect(list.head).toBe(next);
}

describe("DoubleList", () => {
  it("starts empty with null endpoints", () => {
    expectList(new DoubleList(), []);
  });

  it("prepends values and returns the same list for chaining", () => {
    const list = new DoubleList<number>();

    expect(list.prepend(2)).toBe(list);
    expectList(list, [2]);
    expect(list.prepend(1).prepend(0)).toBe(list);
    expectList(list, [0, 1, 2]);
  });

  it("appends values and returns the same list for chaining", () => {
    const list = new DoubleList<number>();

    expect(list.append(0)).toBe(list);
    expectList(list, [0]);
    expect(list.append(1).append(2)).toBe(list);
    expectList(list, [0, 1, 2]);
  });

  it.each([-2, 0, 2])("inserts into an empty list at index %i", index => {
    const list = new DoubleList<number>();

    expect(list.insert(index, 42)).toBe(list);

    expectList(list, [42]);
  });

  it.each([
    { index: -2, expected: [99, 0, 1, 2, 3, 4, 5] },
    { index: 0, expected: [99, 0, 1, 2, 3, 4, 5] },
    { index: 2, expected: [0, 1, 99, 2, 3, 4, 5] },
    { index: 3, expected: [0, 1, 2, 99, 3, 4, 5] },
    { index: 6, expected: [0, 1, 2, 3, 4, 5, 99] },
    { index: 8, expected: [0, 1, 2, 3, 4, 5, 99] },
  ])(
    "inserts at index $index and preserves both links",
    ({ index, expected }) => {
      const list = new DoubleList<number>();
      [0, 1, 2, 3, 4, 5].forEach(value => list.append(value));

      expect(list.insert(index, 99)).toBe(list);

      expectList(list, expected);
    }
  );

  it("reads every index from both halves without changing the list", () => {
    const values = [10, 20, 30, 40, 50, 60];
    const list = new DoubleList<number>();
    values.forEach(value => list.append(value));

    values.forEach((value, index) => expect(list.at(index)).toBe(value));

    expectList(list, values);
  });

  it.each([0, 1, 3, 5])("deletes index %i and preserves both links", index => {
    const values = [0, 1, 2, 3, 4, 5];
    const list = new DoubleList<number>();
    values.forEach(value => list.append(value));

    expect(list.delete(index)).toBe(list);

    expectList(
      list,
      values.filter((_, i) => i !== index)
    );
  });

  it.each(["prepend", "append"] as const)(
    "can be reused with %s after deleting its only node",
    method => {
      const list = new DoubleList<number>().append(1);

      expect(list.delete(0)).toBe(list);
      expectList(list, []);
      list[method](2);
      expectList(list, [2]);
    }
  );

  it.each([-1, 0, 1])("rejects deletion from an empty list at %i", index => {
    const list = new DoubleList();

    expect(() => list.delete(index)).toThrow("List is empty");

    expectList(list, []);
  });

  it.each([-1, 0, 1])("rejects reading an empty list at %i", index => {
    expect(() => new DoubleList().at(index)).toThrow("Index out of bounds");
  });

  describe.each(["at", "delete"] as const)("%s bounds", method => {
    it.each([-1, 3, 10])(
      "rejects index %i without modifying the list",
      index => {
        const list = new DoubleList<number>().append(1).append(2).append(3);

        expect(() => list[method](index)).toThrow("Index out of bounds");

        expectList(list, [1, 2, 3]);
      }
    );
  });

  it("preserves object identity, duplicate values, and nullish values", () => {
    const object = { id: 1 };
    const values = [object, null, undefined, object];
    const list = new DoubleList<(typeof values)[number]>();
    values.forEach(value => list.append(value));

    expectList(list, values);
    values.forEach((value, index) => expect(list.at(index)).toBe(value));
  });

  it("returns independent arrays that cannot change the list structure", () => {
    const list = new DoubleList<number>().append(1).append(2);
    const array = list.toArray();

    array[0] = 99;
    array.push(3);

    expectList(list, [1, 2]);
    expect(list.toArray()).not.toBe(list.toArray());
  });

  it("creates independent iterators", () => {
    const list = new DoubleList<number>().append(1).append(2);
    const first = list[Symbol.iterator]();
    const second = list[Symbol.iterator]();

    expect(first.next()).toEqual({ value: 1, done: false });
    expect(first.next()).toEqual({ value: 2, done: false });
    expect(second.next()).toEqual({ value: 1, done: false });
    expect(first.next()).toEqual({ value: undefined, done: true });
    expect(second.next()).toEqual({ value: 2, done: false });
    expect(second.next()).toEqual({ value: undefined, done: true });
  });
});

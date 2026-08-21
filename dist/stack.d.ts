export declare class Stack<V = unknown> {
    #private;
    get size(): number;
    push(value: V): void;
    pop(): V | undefined;
    peek(): V | undefined;
    isEmpty(): boolean;
    includes(value: V): boolean;
    clear(): void;
    [Symbol.iterator](): ArrayIterator<V>;
}
//# sourceMappingURL=stack.d.ts.map
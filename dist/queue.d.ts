type Task = (...args: any[]) => unknown;
/**
 * Tasks queue. Does not execute tasks, just allows:
 * - To enqueue a task
 * - To request the next one in the queue
 */
export declare class Queue {
    #private;
    enqueue(task: Task): void;
    dequeue(): Task | undefined;
    flush(): void;
    get size(): number;
}
export {};
//# sourceMappingURL=queue.d.ts.map
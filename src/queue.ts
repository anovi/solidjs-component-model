import { DoubleList } from "./double-list";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Task = (...args: any[]) => unknown;

/**
 * Tasks queue. Does not execute tasks, just allows:
 * - To enqueue a task
 * - To request the next one in the queue
 */
export class Queue {
    
    #buffer: DoubleList<Task> = new DoubleList();

    enqueue(task: Task) {
        this.#buffer.append(task);
    }

    dequeue(): Task | undefined {
        if (this.#buffer.length === 0) return undefined;
        const task = this.#buffer.at(0);
        this.#buffer.delete(0);
        return task;
    }

    flush(): void {
        while (this.#buffer.length > 0) {
            this.#buffer.delete(0);
        }
    }

    get size(): number {
        return this.#buffer.length;
    }

}

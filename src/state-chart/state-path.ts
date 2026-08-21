import type { TransitionStep, Event, ExecutionContext } from "./state-chart-types";


/* eslint-disable @typescript-eslint/no-explicit-any */
type L1<T, P extends string = ""> =
    T extends { states?: infer S extends Record<string, any> }
        ? {
            [K in keyof S & string]:
                `${P}${K}`
        }[keyof S & string]
        : never;

type L2<T, P extends string = ""> =
    T extends { states?: infer S extends Record<string, any> }
        ? {
            [K in keyof S & string]:
                | `${P}${K}`
                | L1<S[K], `${P}${K}.`>
        }[keyof S & string]
        : never;

type L3<T, P extends string = ""> =
    T extends { states?: infer S extends Record<string, any> }
        ? {
            [K in keyof S & string]:
                | `${P}${K}`
                | L2<S[K], `${P}${K}.`>
        }[keyof S & string]
        : never;

// ...continue up to L6...

export type StatePaths<T> = L3<T>;

/**
 * @example A `TransitionDiff` for transition `state1.child1` → `state1.child2` will be:
 * ```ts
 * {
 *   common: ["state1"],
 *   exit: ["child1"],
 *   enter: ["child2"],
 * }
 * ```
*/
export type TransitionDiff = {
    common: string[],
    enter: string[],
    exit: string[]
}


export function diffPaths(from: string[], to: string[]): TransitionDiff {
    const common: string[] = [];
    let index = 0
    while (index < from.length && index < to.length && from[index] === to[index]) {
        common.push(from[index]);
        index++;
    }
    return {
        common,
        exit: from.slice(common.length),
        enter: to.slice(common.length),
    };
}

/**
 * Yields each intermediate step between exit state and enter state.
 * In exiting phase yields with `up: true`.
 *
 * @param diff - A TransitionDiff object
 * @yields The current transition step, and whether it's in exit phase.
 */
export function* generateTransitionSteps(diff: TransitionDiff): Generator<TransitionStep<ExecutionContext, Event>, void> {
    const commonLength = diff.common.length;
    const finalLength = diff.common.length + diff.enter.length;
	const current = [...diff.common, ...diff.exit];
    const toEnter = [...diff.enter];

    // Moving up
    while (current.length !== commonLength) {
        yield { path: current.join('.').replace(/^\./, ''), exit: true }
        current.pop();
    }

    while (current.length !== finalLength) {
        const elem = toEnter.shift()
        if (elem == null) break;
        current.push(elem);
        yield { path: current.join('.').replace(/^\./, ''), exit: false }
    }
}


export class StatePath {
    #stack: Array<string> = [];

    get length() { return this.#stack.length }

    constructor(statePathString: string = '') {
        this.#stack = statePathString.split('.');
        if (this.#stack[0] !== '') this.#stack.unshift('');
    }

    toString(): string {
        const result = this.#stack.join('.');
        if (result.startsWith('.')) return result.slice(1);
        return result;
    }

    toArray() {
        return [...this.#stack];
    }

    static fromArray(array: string[]) {
        const path = new StatePath();
        path.#stack = array;
        if (path.#stack[0] !== '') path.#stack.unshift('');
        return path;
    }

    diffFrom(path: StatePath) {
        return diffPaths(path.#stack, this.#stack);
    }

    /** Iterator of segments */
    *[Symbol.iterator](): IterableIterator<string> {
        for (let i = 0; i < this.#stack.length; i++) {
            yield this.#stack[i];
        }
    }

    /** Returns parent path, or undefined if at root */
    parent(): StatePath | undefined {
        if (this.#stack.length <= 1) return undefined;
        const parent = new StatePath();
        parent.#stack = this.#stack.slice(0, -1);
        return parent;
    }

    child(segment: string): StatePath {
        const child = new StatePath();
        child.#stack = [...this.#stack]
        child.#stack.push(segment);
        return child;
    }

    /** Iterator state paths */
    *paths(): IterableIterator<StatePath> {
        for (let i = 1; i <= this.#stack.length; i++) {
            const path = new StatePath();
            path.#stack = this.#stack.slice(0, i)
            yield path;
        }
    }

    /** Reversed iterator state paths */
    *pathsReversed(): IterableIterator<StatePath> {
        for (let i = this.#stack.length; i >= 1; i--) {
            const path = new StatePath();
            path.#stack = this.#stack.slice(1, i)
            yield path;
        }
    }

    /** Reversed iterator state path strings */
    *ancestors(): IterableIterator<string> {
        for (let i = this.#stack.length; i >= 0; i--) {
            yield this.#stack.slice(1, i).join('.');
        }
    }

}
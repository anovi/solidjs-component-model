import type { TransitionStep } from "./state-chart";
import type { AnyModel, Event } from "./types";
type L1<T, P extends string = ""> = T extends {
    states?: infer S extends Record<string, any>;
} ? {
    [K in keyof S & string]: `${P}${K}`;
}[keyof S & string] : never;
type L2<T, P extends string = ""> = T extends {
    states?: infer S extends Record<string, any>;
} ? {
    [K in keyof S & string]: `${P}${K}` | L1<S[K], `${P}${K}.`>;
}[keyof S & string] : never;
type L3<T, P extends string = ""> = T extends {
    states?: infer S extends Record<string, any>;
} ? {
    [K in keyof S & string]: `${P}${K}` | L2<S[K], `${P}${K}.`>;
}[keyof S & string] : never;
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
    common: string[];
    enter: string[];
    exit: string[];
};
export declare function diffPaths(from: string[], to: string[]): TransitionDiff;
/**
 * Yields each intermediate step between exit state and enter state.
 * In exiting phase yields with `up: true`.
 *
 * @param diff - A TransitionDiff object
 * @yields The current transition step, and whether it's in exit phase.
 */
export declare function generateTransitionSteps(diff: TransitionDiff): Generator<TransitionStep<AnyModel, Event>, void>;
export declare class StatePath {
    #private;
    get length(): number;
    constructor(statePathString?: string);
    toString(): string;
    toArray(): string[];
    diffFrom(path: StatePath): TransitionDiff;
    /** Reversed iterator of segments */
    [Symbol.iterator](): Generator<string, void, unknown>;
    /** Returns parent path, or undefined if at root */
    parent(): StatePath | undefined;
    /** Reversed iterator state path strings */
    ancestors(): IterableIterator<string>;
}
export {};
//# sourceMappingURL=state-path.d.ts.map
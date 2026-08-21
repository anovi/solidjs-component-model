import type { InternalEvent } from "./events";
import type { TransitionStep, EventNodeHandler, Event, AnyStateChartConfig, AnyModel, AnyAction } from "./types";
type Chart = AnyStateChartConfig;
/**
 * State chart does not own data or effects.
 *
 * It only tells what transitions should be when you pass event to it.
*/
export declare class StateChart<TModel extends AnyModel, E extends Event> {
    #private;
    /** key is nodeID, value is a Set of child states IDs */
    nodes: Map<string, Set<string>>;
    /** key is nodeID, value is set nodeIDs to transition to */
    transitions: Map<string, Set<string>>;
    /** IDs of final states */
    finals: Set<string>;
    /** <nodeID, parent nodeID> */
    parentMap: Map<string, string>;
    /** <nodeID, StateChart> */
    charts: Map<string, Chart>;
    static create(config: AnyStateChartConfig): StateChart<AnyModel, Event>;
    constructor();
    getHandlers(path: string, event?: Event): EventNodeHandler<TModel, E>[] | undefined;
    getEntryEffect(path: string): AnyAction | undefined;
    getExitEffect(path: string): AnyAction | undefined;
    resolveFinalState(pathString: string): string;
    createRuntime(): Interpreter<TModel, E>;
}
/**
 * Runtime interpreter of a state chart.
 * It's stateless, it only has two methods which is pure functions.
*/
export declare class Interpreter<TModel extends AnyModel, E extends Event> {
    private readonly compiled;
    constructor(compiled: StateChart<TModel, E>);
    /**
     * Returns a generator with micro-steps you need to perform to make a transition.
     *
     * For starting transition call `.transition('', '')`
    */
    transition(fromStateString: string, toStateString: string, reenter?: boolean): Generator<TransitionStep<TModel, E | InternalEvent>>;
    /**
     * Get a handler for an event in a given state.
     *
     * Makes lookup starting from deepest state node, moving up, executing guards.
     * Returns the first matched event handler.
     *
     * If no event is passed, it treats it as eventless transition (always).
     *
     * @see {@link http://localhost:5173/event-loop#transition-lookup|Transition lookup}
     */
    getMostSpecificHandler(context: TModel, pathString: string, event?: E): EventNodeHandler<TModel, E> | Error | undefined;
}
export {};
//# sourceMappingURL=state-chart.d.ts.map
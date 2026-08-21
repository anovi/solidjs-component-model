import type { AnyAction, Event, AnyStateChartConfig, Transition, TransitionStep, ExecutionContext } from "./state-chart-types";
/**
 * State chart does not own data or effects.
 *
 * It only tells what transitions should be when you pass event to it.
*/
export declare class StateChart<TModel extends ExecutionContext, E extends Event = Event> {
    #private;
    /** IDs of final states */
    finals: Set<string>;
    /** <nodeID, StateChart> */
    charts: Map<string, AnyStateChartConfig>;
    static create<TModel extends ExecutionContext, E extends Event = Event>(config: AnyStateChartConfig): StateChart<TModel, E>;
    constructor();
    getHandlers(path: string, event?: Event): Transition<TModel, E>[] | undefined;
    getEntryEffect(path: string): AnyAction | undefined;
    getExitEffect(path: string): AnyAction | undefined;
    resolveFinalState(pathString: string): string;
    createRuntime(context: TModel): Interpreter<TModel, E>;
}
/**
 * Runtime interpreter of a state chart.
 * It's stateless, it only has two methods which is pure functions.
*/
export declare class Interpreter<TModel extends ExecutionContext, E extends Event = Event> {
    private context;
    private readonly compiled;
    constructor(context: TModel, compiled: StateChart<TModel, E>);
    /**
     * Returns a generator with micro-steps you need to perform to make a transition.
     *
     * For starting transition call `.transition('', '')`
    */
    transition(fromStateString: string, toStateString: string, reenter?: boolean): Generator<TransitionStep<TModel, E>>;
    /**
     * Get a handler for an event in a given state.
     *
     * Lookup a handler starting from deepest state, moving up, executing guards.
     * Returns the first matched transition.
     *
     * If no event is passed, it checks for an eventless transition (always), deep first as well.
     *
     * @see {@link http://localhost:5173/event-loop#transition-lookup|Transition lookup}
     */
    getMostSpecificHandler(pathString: string, event?: E): Transition<TModel, E> | Error | undefined;
}
//# sourceMappingURL=state-chart.d.ts.map
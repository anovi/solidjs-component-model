import type { Event, Transition, TransitionStep, ExecutionContext, StateChartConfig, ExtractInstance } from "./state-chart-types";
import { type AnyStateNode } from "./state-node";
/**
 * State chart does not own data or effects.
 *
 * It only tells what transitions should be when you pass event to it.
*/
export declare class StateChart<TModel extends ExecutionContext = any, E extends Event = Event, TConfig = StateChartConfig<TModel, E>> {
    #private;
    root: AnyStateNode;
    lookup: Map<string, AnyStateNode>;
    config: TConfig;
    static create<TContext = any, E extends Event = Event, TConfig extends StateChartConfig<ExtractInstance<TContext>, E> = StateChartConfig<ExtractInstance<TContext>, E>>(config: TConfig): StateChart<ExtractInstance<TContext>, E, TConfig>;
    getNodeByPath(path: string): AnyStateNode | undefined;
    getEventHandlers(path: string, event?: Event): Transition<TModel, any>[] | undefined;
    resolveFinalState(path?: string): string;
    createRuntime(context: TModel): Interpreter<TModel, E>;
}
/**
 * Runtime interpreter of a state chart.
 * It's stateless, it only has two methods which is pure functions.
*/
export declare class Interpreter<TModel extends ExecutionContext, E extends Event = Event> {
    private context;
    private readonly chart;
    constructor(context: TModel, chart: StateChart<TModel, E, any>);
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
    getMostSpecificHandler(pathString: string, event?: E): Transition<TModel, any> | Error | undefined;
}
//# sourceMappingURL=state-chart.d.ts.map
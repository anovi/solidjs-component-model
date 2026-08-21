import { generateTransitionSteps, StatePath } from "./state-path";
import { EntrySym, EventlessSym, ExitSym } from "./symbols";
import { StateEventHandlersMap } from "./state-event-handlers-map";
import type { AnyAction, Event, AnyStateChartConfig, Transition, TransitionStep, ExecutionContext } from "./state-chart-types";
import { MachineMalformed } from "./errors";



const ROOT = '';

/**
 * State chart does not own data or effects.
 * 
 * It only tells what transitions should be when you pass event to it.
*/
export class StateChart<
    TModel extends ExecutionContext,
    E extends Event = Event,
> {

    /** IDs of final states */
    finals: Set<string>;

    /** <nodeID, StateChart> */
    charts: Map<string, AnyStateChartConfig>;

    static create<
        TModel extends ExecutionContext,
        E extends Event = Event,
    >(config: AnyStateChartConfig): StateChart<TModel, E> {
        const inst = new StateChart<TModel, E>();
        inst.#mapHandlers(ROOT, config);
        inst.#buildStateChart(ROOT, config);
        inst.#validateHandlers();
        return inst;
    }

    constructor() {
        this.charts = new Map();
		this.finals = new Set();
    }

    getHandlers(path: string, event?: Event): Transition<TModel, E>[] | undefined {
        if (event) {
            return this.#stateEventHandlersMap.get(path)?.get(event.type);
        }
        return this.#stateEventHandlersMap.get(path)?.get(EventlessSym);
    }

    getEntryEffect(path: string) {
        return this.#stateTransitionActionsMap.get(path)?.get(EntrySym);
    }

    getExitEffect(path: string) {
        return this.#stateTransitionActionsMap.get(path)?.get(ExitSym);
    }

    resolveFinalState(pathString: string) {
        let node: AnyStateChartConfig|undefined = this.charts.get(pathString);
        if (!node) throw new MachineMalformed(`wrong transition target "${pathString}"`, { machineConfig: null })
        let toAssign = pathString;
        while (node && node.initial) {
            const name = node.initial;
            node = node?.states?.[name] as AnyStateChartConfig;
            if (!node) throw new MachineMalformed(`wrong initial target "${name}" in "${toAssign}"`, { machineConfig: null })
            toAssign += '.' + name;
        }
        return toAssign.replace(/^\./, ROOT);
    }

    createRuntime(context: TModel): Interpreter<TModel, E> {
        return new Interpreter(context, this);
    }

    /** [key: string] is state name, [value: Map] is map where [key: string] is event name   */
    #stateEventHandlersMap = new StateEventHandlersMap();

    #stateTransitionActionsMap = new Map<string, Map<typeof ExitSym | typeof EntrySym, AnyAction>>();

    #nodeCantHave(config: AnyStateChartConfig, prop: keyof AnyStateChartConfig, path: string): void {
        if (config[prop])
            throw new MachineMalformed(`State ${path} of type "${config.type}" can't have "${prop}" property.`, { machineConfig: config });
    }

    #validateHandlers() {
        for (const [path, stateHandlers] of this.#stateEventHandlersMap) {
            void path;
            for (const [eventName, eventHandlers] of stateHandlers) {
                void eventName;
                eventHandlers.forEach(handler => {
                    if (handler.target && !this.charts.get(handler.target))
                        throw new MachineMalformed(`target "${handler.target}" points to unexisting state.`, { machineConfig: null });
                })
            }
        }
    }

    #addNode(nodeID: string, chart: AnyStateChartConfig, final?: boolean): void {
        if (!this.charts.has(nodeID)) {
            if (nodeID === ROOT && this.charts.has(ROOT)) throw Error('Root is already set.');
			this.charts.set(nodeID, chart);
			if (final) this.finals.add(nodeID);
        }
    }

    #mapHandlers(address: string, stateNode: AnyStateChartConfig) {
        if (stateNode.always) {
            const res = Array.isArray(stateNode.always) ? stateNode.always : [stateNode.always];
            this.#stateEventHandlersMap.set(address, EventlessSym, res);
        }
        const transitionEffectsInState = this.#stateTransitionActionsMap.get(address) || new Map();
        if (stateNode.entry) transitionEffectsInState.set(EntrySym, stateNode.entry);
        if (stateNode.exit) transitionEffectsInState.set(ExitSym, stateNode.exit);
        if (transitionEffectsInState.size > 0) this.#stateTransitionActionsMap.set(address, transitionEffectsInState);
        for (const key in stateNode.on) {
            if (!Object.hasOwn(stateNode.on, key)) continue;
            const eventName = key;
            const eventHandler = stateNode.on[eventName]!;
            const res = Array.isArray(eventHandler) ? eventHandler : [eventHandler];
            this.#stateEventHandlersMap.set(address, eventName, res);
        }
        if ('states' in stateNode) {
            for (const name in stateNode.states) {
                if (!Object.hasOwn(stateNode.states, name)) continue;
                const childStateNode = stateNode.states[name];
                this.#mapHandlers(address === ROOT ? name : address + '.' + name, childStateNode);
            }
        }
    }

    #buildStateChart(address: string, stateNode: AnyStateChartConfig) {
        switch (stateNode.type) {
            case 'parallel':
                this.#nodeCantHave(stateNode, 'initial', address);
                break;
            case 'final':
                this.#nodeCantHave(stateNode, 'always', address);
                this.#nodeCantHave(stateNode, 'exit', address);
                this.#nodeCantHave(stateNode, 'initial', address);
                this.#nodeCantHave(stateNode, 'on', address);
                this.#nodeCantHave(stateNode, 'states', address);
                break;
            case 'history':
                break;
        }

        this.#addNode(address, stateNode);

        if ('states' in stateNode) {
            if (!stateNode.initial) {
                throw new MachineMalformed('missing initial state', { machineConfig: stateNode });
            }
            for (const name in stateNode.states) {
                if (!Object.hasOwn(stateNode.states, name)) continue;
                const childStateNode = stateNode.states[name];
                this.#addNode(address, childStateNode);
                this.#buildStateChart(address === ROOT ? name : address + '.' + name, childStateNode);
            }
        }
    }
}

/**
 * Runtime interpreter of a state chart.
 * It's stateless, it only has two methods which is pure functions.
*/
export class Interpreter<
    TModel extends ExecutionContext,
    E extends Event = Event
> {

    constructor(
        private context: TModel,
        private readonly compiled: StateChart<TModel, E>,
    ) {}

    /**
     * Returns a generator with micro-steps you need to perform to make a transition.
     * 
     * For starting transition call `.transition('', '')`
    */
    *transition(fromStateString: string, toStateString: string, reenter?: boolean): Generator<TransitionStep<TModel, E>> {
        const currentState = fromStateString;
        if (reenter && currentState === toStateString) {
            yield {exit: true, path: currentState, effect: this.compiled.getExitEffect(currentState)};
            yield {exit: false, path: currentState, effect: this.compiled.getEntryEffect(currentState)};
            return
        }
        const from = new StatePath(currentState);
        const target = new StatePath(this.compiled.resolveFinalState(toStateString));
        const diff = target.diffFrom(from);
        // Why: For model that starts we need to produce that step so model run entry effect of the top node.
        if (currentState === '') yield { path: ROOT, exit: false, effect: this.compiled.getEntryEffect(ROOT) };
        for (const step of generateTransitionSteps(diff)) {
            if (this.compiled.finals.has(step.path)) step.final = true;
            step.effect = step.exit
                ? this.compiled.getExitEffect(step.path)
                : this.compiled.getEntryEffect(step.path);
            yield step;
        }
    }

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
    getMostSpecificHandler(pathString: string, event?: E): Transition<TModel, E> | Error | undefined {
        const statePath = new StatePath(pathString);
        for (const curPath of statePath.ancestors()) {
            const handlers = this.compiled.getHandlers(curPath, event);
            if (handlers) {
                for (const handler of handlers) {
                    if (handler.guard) {
                        try {
                            if (handler.guard.call(this.context, event as never)) return handler;
                        } catch (error: unknown) {
                            return new MachineMalformed(`error in guard in state "${curPath}"`, { cause: error, machineConfig: this.constructor })
                        }
                    }
                    else return handler;
                }
            }
        }
    }
}

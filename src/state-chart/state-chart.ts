/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Event, AnyStateChartConfig, Transition, TransitionStep, ExecutionContext, StateChartConfig } from "./state-chart-types";
import { generateTransitionSteps, StatePath } from "./state-path";
import { NodeType, type AnyStateNode } from "./state-node";
import { MachineMalformed } from "./errors";



const ROOT = '';

/**
 * State chart does not own data or effects.
 * 
 * It only tells what transitions should be when you pass event to it.
*/
export class StateChart<
    TModel,
    E extends Event = Event,
    TConfig = StateChartConfig<TModel, E>,
> {

    root!: AnyStateNode;
    lookup: Map<string, AnyStateNode> = new Map();
    config!: TConfig;

    static create<
        TContext = any,
        E extends Event = Event,
        TConfig extends StateChartConfig<TContext, E> = StateChartConfig<TContext, E>,
        // Intersection is required to provide a concrete contextual type for autocompletion.
        // TConfig only is used for checking, but isn't being used to produce completion candidates.
    >(config: StateChartConfig<TContext, E> & TConfig): StateChart<TContext, E, TConfig> {
        const inst = new StateChart<TContext, E, TConfig>();
        inst.root = inst.#makeNode(config as AnyStateChartConfig, null, '');
        inst.config = config;
        inst.#validateHandlers();
        return inst;
    }

    getNodeByPath(path: string): AnyStateNode | undefined {
        return this.lookup.get(path);
    }

    getEventHandlers(path: string, event?: Event): Transition<TModel, any>[] | undefined {
        const node = this.getNodeByPath(path);
        if (!node) throw new MachineMalformed(`unable to find sate "${path.toString()}"`, { machineConfig: null })
        if (event) {
            if (node.on) return node.on[event.type];
        }
        if (node.always) return node.always as Transition<TModel, any>[] | undefined;
    }

    resolveFinalState(path: string = ROOT): string {
        let node: AnyStateNode | undefined = this.getNodeByPath(path);
        if (!node) throw new MachineMalformed(`wrong transition target "${path.toString()}"`, { machineConfig: null })
        let toAssign = path;
        while (node.initial) {
            node = node.initial;
            if (node)
                toAssign = toAssign === '' ? node.name : toAssign + '.' + node.name
        }
        return toAssign;
    }

    createRuntime(context: TModel): Interpreter<TModel, E> {
        return new Interpreter(context, this);
    }

    #nodeCantHave(config: AnyStateChartConfig, prop: keyof AnyStateChartConfig, path: string): void {
        if (config[prop])
            throw new MachineMalformed(`State ${path} of type "${config.type}" can't have "${prop}" property.`);
    }

    #toValidate: Transition<any, any>[][] | null = [];

    #validateHandlers() {
        this.#toValidate!.every(handlers => handlers.every((handler) => {
            if (handler.target && !this.getNodeByPath(handler.target))
                throw new MachineMalformed(`target "${handler.target}" is points to unexisting state.`);
            return true;
        }))
        this.#toValidate = null;
    }

    // eslint-disable-next-line complexity
    #makeNode(config: AnyStateChartConfig, parent: AnyStateNode | null, path: string): AnyStateNode {
        const node = Object.create(null) as AnyStateNode;
        node.parent = parent;
        if (parent === null) node.name = ROOT;

        if (config.entry) node.entry = config.entry;
        if (config.exit) node.exit = config.exit;
        if (config.always) {
            const handlers = Array.isArray(config.always) ? config.always : [config.always];
            node.always = handlers
            this.#toValidate!.push(handlers as Transition<any, any>[]);
        }

        if (config.type) {
            switch (config.type) {
                case 'parallel':
                    node.type = NodeType.parallel;
                    this.#nodeCantHave(config, 'initial', path);
                    break;
                case 'final':
                    this.#nodeCantHave(config, 'always', path);
                    this.#nodeCantHave(config, 'exit', path);
                    this.#nodeCantHave(config, 'initial', path);
                    this.#nodeCantHave(config, 'on', path);
                    this.#nodeCantHave(config, 'states', path);
                    node.type = NodeType.final;
                    break;
                case 'history':
                    node.type = NodeType.history;
                    break;
            }
        }

        if (config.on) {
            node.on = {};
            for (const key in config.on) {
                if (!Object.hasOwn(config.on, key)) continue;
                const eventName = key;
                const eventHandler = config.on[eventName]!;
                const res = Array.isArray(eventHandler) ? eventHandler : [eventHandler];
                this.#toValidate!.push(res);
                node.on[key] = res;
            }
        }
        
        if (config.states) {
            if (!config.initial) {
                throw new MachineMalformed('missing initial state', { machineConfig: config });
            }
            const children = node.children = Object.create(null);
            for (const name in config.states) {
                if (!Object.hasOwn(config.states, name)) continue;
                const stateConfig = config.states[name];
                const child = this.#makeNode(stateConfig, node, path === '' ? name : `${path}.${name}`);
                child.name = name;
                children[name] = child;
            }
        }

        if (config.initial) {
            if (!node.children) throw new MachineMalformed('State with initial should have child states.');
            const initial = node.children[config.initial];
            if (!initial) throw new MachineMalformed('Initial in state is not found.')
            node.initial = initial;
        }

        this.lookup.set(path, node);
        return node;
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
        private readonly chart: StateChart<TModel, E, any>,
    ) {}

    /**
     * Returns a generator with micro-steps you need to perform to make a transition.
     * 
     * For starting transition call `.transition('', '')`
    */
    *transition(fromStateString: string, toStateString: string, reenter?: boolean): Generator<TransitionStep<TModel, E>> {
        // const currentState = new StatePath(fromStateString);
        if (reenter && fromStateString === toStateString) {
            const node = this.chart.getNodeByPath(fromStateString);
            if (!node) throw new MachineMalformed(`unable to find sate "${fromStateString}"`, { machineConfig: null })
            yield { exit: true, path: fromStateString, effect: node.exit };
            yield { exit: false, path: fromStateString, effect: node.entry };
            return
        }
        const from = new StatePath(fromStateString);
        const target = new StatePath(this.chart.resolveFinalState(toStateString));
        const diff = target.diffFrom(from);
        // WHY: when model starts we need it to run an entry effect of the root node.
        if (fromStateString === ROOT) yield { path: ROOT, exit: false, effect: this.chart.root.entry };
        for (const step of generateTransitionSteps(diff)) {
            const node = this.chart.lookup.get(step.path);
            if (!node) throw new MachineMalformed(`unable to find sate "${step.path}"`, { machineConfig: null })
            step.effect = step.exit ? node.exit : node.entry;
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
    getMostSpecificHandler(pathString: string, event?: E): Transition<TModel, any> | Error | undefined {
        const statePath = new StatePath(pathString);
        for (const curPath of statePath.ancestors()) {
            const handlers = this.chart.getEventHandlers(curPath, event);
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

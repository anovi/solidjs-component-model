/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Event } from "./events";
import type { AnyStateChartConfig, StateChartConfig } from "./state-chart";
import type { StatePaths } from "./state-chart/state-path";
import { ComponentModel } from "./component-model";
import { StateChart } from "./state-chart";



// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;

export interface StateChartMethods<TConfig> {
    matches: (path: StatePaths<TConfig>) => boolean;
}

type WithStateChartConstructor<TBase extends Constructor, TConfig> =
    Omit<TBase, "prototype"> &
    {
        new (...args: ConstructorParameters<TBase>):
            InstanceType<TBase> &
            StateChartMethods<TConfig>;

        config: TConfig;
    };

const descriptors = {
    matches: {
        value(this: ComponentModel, state: string): boolean {
            const current = this.state();
            if (!current) return false;
            if (state.length > current.length) return false;
            return current.startsWith(state) && (
                state.length === current.length ||
                current.slice(state.length).startsWith('.')
            );
        }
    }
} satisfies PropertyDescriptorMap;

function installStateChartMethods(proto: object) {
    if ("matches" in proto) return;
    Object.defineProperties(proto, descriptors);
}

export function WithStateChart<
    TBase extends Constructor<ComponentModel<any, any, any, any>>,
    E extends Event = InstanceType<TBase> extends ComponentModel<any, infer EE, any, any>
        ? EE
        : Event,
    TConfig extends StateChartConfig<InstanceType<TBase>, E> = StateChartConfig<InstanceType<TBase>, E>,
>(
    Base: TBase,
    config: TConfig,
    name?: string,
): WithStateChartConstructor<TBase, TConfig>;

export function WithStateChart<
    TBase extends Constructor<ComponentModel<any, any, any, any>>,
    E extends Event = InstanceType<TBase> extends ComponentModel<any, infer EE, any, any>
        ? EE
        : Event,
    TConfig extends StateChartConfig<InstanceType<TBase>, E> = StateChartConfig<InstanceType<TBase>, E>,
>(
    Base: TBase,
    chart: StateChart<InstanceType<TBase>, E, TConfig>,
    name?: string,
): WithStateChartConstructor<TBase, TConfig>;

export function WithStateChart<
    TBase extends Constructor<ComponentModel<any, any, any, any>>,
    E extends Event = InstanceType<TBase> extends ComponentModel<any, infer EE, any, any>
        ? EE
        : Event,
    TConfig extends StateChartConfig<InstanceType<TBase>, E> = StateChartConfig<InstanceType<TBase>, E>,
>(
    Base: TBase,
    configOrChart: TConfig | StateChart<InstanceType<TBase>, E, TConfig>,
    name?: string,
): WithStateChartConstructor<TBase, TConfig> {

    const stateChart = configOrChart instanceof StateChart
        ? configOrChart
        : StateChart.create(configOrChart as AnyStateChartConfig);

    class WithStateChartC extends Base {
        // @ts-ignore Just setting static property
        private static chart = stateChart;
    }

    Object.defineProperty(WithStateChartC, 'name', { value: name || Base.name });

    installStateChartMethods(WithStateChartC.prototype);

    return WithStateChartC as unknown as WithStateChartConstructor<TBase, TConfig>;
}

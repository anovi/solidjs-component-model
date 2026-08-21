import type { Event } from "./events";
import type { StateChartConfig } from "./state-chart";
import type { StatePaths } from "./state-chart/state-path";
import { ComponentModel } from "./component-model";
import { StateChart } from "./state-chart";
type Constructor<T = object> = new (...args: any[]) => T;
export interface StateChartMethods<TConfig> {
    matches: (path: StatePaths<TConfig>) => boolean;
}
type WithStateChartConstructor<TBase extends Constructor, TConfig> = Omit<TBase, "prototype"> & {
    new (...args: ConstructorParameters<TBase>): InstanceType<TBase> & StateChartMethods<TConfig>;
    config: TConfig;
};
export declare function WithStateChart<TBase extends Constructor<ComponentModel<any, any, any, any>>, E extends Event = InstanceType<TBase> extends ComponentModel<any, infer EE, any, any> ? EE : Event, TConfig extends StateChartConfig<InstanceType<TBase>, E> = StateChartConfig<InstanceType<TBase>, E>>(Base: TBase, config: TConfig, name?: string): WithStateChartConstructor<TBase, TConfig>;
export declare function WithStateChart<TBase extends Constructor<ComponentModel<any, any, any, any>>, E extends Event = InstanceType<TBase> extends ComponentModel<any, infer EE, any, any> ? EE : Event, TConfig extends StateChartConfig<InstanceType<TBase>, E> = StateChartConfig<InstanceType<TBase>, E>>(Base: TBase, chart: StateChart<InstanceType<TBase>, E, TConfig>, name?: string): WithStateChartConstructor<TBase, TConfig>;
export {};
//# sourceMappingURL=create-chart.d.ts.map
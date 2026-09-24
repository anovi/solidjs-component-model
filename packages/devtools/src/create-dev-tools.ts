import {
  StateChart,
  type GlobalDevContext,
  type ComponentModelDevToolsServerFactory,
  type AnyComponentModel,
  type AnyModel,
  type Event,
  type AnyStateChartConfig,
  type StateChartDescriptor,
} from "solid-component-model";
import { ApiServer } from "@solid-component-model/rpc";

export function chartToDebugger(
  chart: StateChart<AnyModel, Event, AnyStateChartConfig>
): StateChartDescriptor {
  return {
    _id: chart._id,
    states: [...chart.lookup.keys()].filter(key => key !== ""),
  };
}

export function createDevTools(
  aliveModels: Map<string, AnyComponentModel>,
  factory: ComponentModelDevToolsServerFactory
): ApiServer {
  const globalObj = globalThis as unknown as GlobalDevContext;
  const devtools = factory();

  globalObj.__COMPONENT_MODEL_DEVTOOLS__ = devtools;

  devtools.onClientConnect(() => {
    const charts = new Set<StateChart<AnyModel, Event, AnyStateChartConfig>>();
    for (const [id, model] of aliveModels.entries()) {
      void id;
      const chart = model.stateChart;
      if (chart) charts.add(chart.chart);
      devtools.registerModel(model.getInspectionSnapshot());
    }
    charts.forEach(chart => {
      devtools.registerChart(chartToDebugger(chart));
    });
  });

  if (typeof window !== "undefined") {
    window.postMessage(
      {
        source: "scm-devtools",
        type: "COMPONENT_MODEL_DEVTOOLS_CREATED",
      },
      "*"
    );
  }

  return devtools;
}

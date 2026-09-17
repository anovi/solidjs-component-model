import {
  type GlobalDevContext,
  ComponentModelDevToolsServerFactory,
  type AnyComponentModel,
  StateChart,
  AnyModel,
  Event,
  AnyStateChartConfig,
} from "solid-component-model";
import { ApiServer } from "@solid-component-model/rpc";
import { chartToDebugger } from "../../solid-component-model/src/state-chart/state-chart";

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
      devtools.registerModel(model.toJSON(true));
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

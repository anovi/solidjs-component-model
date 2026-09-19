import { createSignal, type Accessor } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import { createModelsStore, ModelsStore } from "../stores/models";
import { LogsStore } from "../stores/logs";
import { ChartsStore, createChartsStore } from "../stores/charts";

type AppState = "loading" | "ok" | "error";

export interface DevtoolsState {
  models: ModelsStore["models"];
  charts: ChartsStore["charts"];
  logger: LogsStore;
  state: Accessor<AppState>;
  error: Accessor<string | null>;
}

export function createDevtoolsState(
  client: ApiClient,
  logger: LogsStore
): DevtoolsState {
  const [state, setState] = createSignal<AppState>("loading");
  const [error, setError] = createSignal<string | null>(null);
  const models = createModelsStore();
  const charts = createChartsStore();
  const clientRef = client;

  function reset() {
    setState("loading");
    setError(null);
    models.reset();
    charts.reset();
    logger.clear();
  }

  reset();
  clientRef.onDisconnected(reset);
  clientRef.onConnected(() => {
    setState("ok");
  });

  clientRef.onModelAdded(snapshot => models.addModel(snapshot));
  clientRef.onModelUpdated(snapshot => models.updateModel(snapshot));
  clientRef.onModelRemoved(id => models.removeModel(id));

  clientRef.onChartRegistered(chart => charts.registerChart(chart));

  clientRef
    .connect()
    .then(() => {
      logger.log("Connected");
      setState("ok");
    })
    .catch(err => {
      setError(String(err));
      setState("error");
      logger.error("Connection failed: " + err);
    });

  return {
    logger,
    error,
    state,
    get models() {
      return models.models;
    },
    get charts() {
      return charts.charts;
    },
  };
}

import { createSignal, type Accessor } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import { createModelsStore, ModelsStore } from "../stores/models";
import { LogsStore } from "../stores/logs";

type AppState = "loading" | "ok" | "error";

export interface DevtoolsState {
  models: ModelsStore["models"];
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
  const clientRef = client;
  // const logger = createLogsStore();

  clientRef.onModelAdded(snapshot => models.addModel(snapshot));
  clientRef.onModelUpdated(snapshot => models.updateModel(snapshot));
  clientRef.onModelRemoved(id => models.removeModel(id));

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
    models: models.models,
  };
}

import { createContext } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import type { LogsStore } from "./stores/logs";
import { DevtoolsState } from "./hooks/useDevtoolsState";


export interface ApiClientProviderProps {
  client: ApiClient;
  logger: LogsStore;
  devtools: DevtoolsState;
  
}

export const ApiClientContext = createContext<ApiClientProviderProps>();
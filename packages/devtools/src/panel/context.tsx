import { createContext } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import type { LogsStore } from "./stores/logs";


export interface ApiClientProviderProps {
  client: ApiClient;
  logger: LogsStore;
}

export const ApiClientContext = createContext<ApiClientProviderProps>();
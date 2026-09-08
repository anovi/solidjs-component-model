import { createSignal, type Accessor } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";
import { useApiClient } from "./useApiClient";

export interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: "info" | "warn" | "error";
}

export interface DevtoolsState {
  models: Accessor<string[]>;
  loading: Accessor<boolean>;
  error: Accessor<string | null>;
  logs: Accessor<LogEntry[]>;
  refresh: () => Promise<string[]>;
  appendLog: (message: string, type?: "info" | "warn" | "error") => void;
  clearLog: () => void;
}

export function createDevtoolsState(
  client?: ApiClient<ComponentModelDevToolsApi>
): DevtoolsState {
  const getClient = (): ApiClient<ComponentModelDevToolsApi> => {
    return client ?? useApiClient<ComponentModelDevToolsApi>();
  };

  const [models, setModels] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string | null>(null);
  const [logs, setLogs] = createSignal<LogEntry[]>([]);
  let logId = 0;

  const appendLog = (
    message: string,
    type: "info" | "warn" | "error" = "info"
  ) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { id: ++logId, time, message, type }]);
  };

  const clearLog = () => {
    setLogs([]);
  };

  const refresh = async () => {
    const activeClient = getClient();
    setLoading(true);
    setError(null);
    appendLog("Fetching models from page...", "info");
    try {
      const result = await activeClient.request("getModels");
      const list = Array.isArray(result) ? result : [];
      setModels(list);
      appendLog(`Received models: ${JSON.stringify(list)}`, "info");
      return list;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      appendLog(`Error fetching models: ${msg}`, "error");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    models,
    loading,
    error,
    logs,
    refresh,
    appendLog,
    clearLog,
  };
}

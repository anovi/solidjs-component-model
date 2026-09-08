import type { ApiClient } from "solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";
import { useApiClient } from "./useApiClient";

export interface DevtoolsState {
  models: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<string[]>;
}

export function createDevtoolsState(
  client?: ApiClient<ComponentModelDevToolsApi>
): DevtoolsState {
  const apiClient = client ?? useApiClient<ComponentModelDevToolsApi>();

  const state: DevtoolsState = {
    models: [],
    loading: false,
    error: null,
    async refresh() {
      state.loading = true;
      state.error = null;
      try {
        const models = await apiClient.request("getModels");
        state.models = Array.isArray(models) ? models : [];
        return state.models;
      } catch (err) {
        state.error = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        state.loading = false;
      }
    },
  };

  return state;
}

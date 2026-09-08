import type { ApiClient, ApiDefinition } from "solid-component-model/rpc";
import { getApiClient } from "../context";

export function useApiClient<TApi extends ApiDefinition>(): ApiClient<TApi> {
  return getApiClient<TApi>();
}

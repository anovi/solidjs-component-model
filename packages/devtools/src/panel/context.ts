import type { ApiClient, ApiDefinition } from "solid-component-model/rpc";

let activeClient: ApiClient<ApiDefinition> | null = null;

export function setApiClient<TApi extends ApiDefinition>(
  client: ApiClient<TApi>
): void {
  activeClient = client;
}

export function getApiClient<TApi extends ApiDefinition>(): ApiClient<TApi> {
  if (!activeClient) {
    throw new Error("ApiClient has not been initialized in panel context");
  }
  return activeClient as unknown as ApiClient<TApi>;
}

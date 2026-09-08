import { createContext, useContext } from "solid-js";
import type { JSX } from "solid-js";
import type { ApiClient, ApiDefinition } from "@solid-component-model/rpc";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ApiClientContext = createContext<ApiClient<any>>();

export interface ApiClientProviderProps<
  TApi extends ApiDefinition = ApiDefinition,
> {
  client: ApiClient<TApi>;
  children?: JSX.Element;
}

export function ApiClientProvider<TApi extends ApiDefinition = ApiDefinition>(
  props: ApiClientProviderProps<TApi>
) {
  setApiClient(props.client);
  return (
    <ApiClientContext.Provider value={props.client}>
      {props.children}
    </ApiClientContext.Provider>
  );
}

export function useApiClientContext<
  TApi extends ApiDefinition = ApiDefinition,
>(): ApiClient<TApi> {
  const ctx = useContext(ApiClientContext);
  if (ctx) {
    return ctx as ApiClient<TApi>;
  }
  return getApiClient<TApi>();
}

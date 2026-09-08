import type { ApiClient, ApiDefinition } from "@solid-component-model/rpc";
import { useApiClientContext } from "../context";

export function useApiClient<
  TApi extends ApiDefinition = ApiDefinition,
>(): ApiClient<TApi> {
  return useApiClientContext<TApi>();
}

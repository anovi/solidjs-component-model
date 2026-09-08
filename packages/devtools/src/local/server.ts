import {
  createApiServer,
  type ApiDefinition,
  type ApiHandlers,
  type ApiServer,
  type ApiServerOptions,
} from "@solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";

export type LocalDevToolsServerOptions<
  TApi extends ApiDefinition = ComponentModelDevToolsApi,
> = ApiServerOptions<TApi>;

/**
 * Creates an ApiServer wired for in-memory / local webapp development.
 */
export function createLocalDevToolsServer<
  TApi extends ApiDefinition = ComponentModelDevToolsApi,
>(
  initialHandlersOrOptions?:
    Partial<ApiHandlers<TApi>> | LocalDevToolsServerOptions<TApi>,
  maybeOptions?: LocalDevToolsServerOptions<TApi>
): ApiServer<TApi> {
  let handlers: Partial<ApiHandlers<TApi>> | undefined;
  let opts: LocalDevToolsServerOptions<TApi> = {};

  if (
    initialHandlersOrOptions &&
    typeof initialHandlersOrOptions === "object"
  ) {
    if (
      "handlers" in initialHandlersOrOptions ||
      "transport" in initialHandlersOrOptions ||
      "source" in initialHandlersOrOptions ||
      "serializeError" in initialHandlersOrOptions
    ) {
      opts = initialHandlersOrOptions as LocalDevToolsServerOptions<TApi>;
      handlers = opts.handlers;
    } else {
      handlers = initialHandlersOrOptions as Partial<ApiHandlers<TApi>>;
      opts = maybeOptions ?? {};
    }
  }

  const source = opts.source ?? "devtools-rpc";

  return createApiServer<TApi>({
    ...opts,
    source,
    handlers,
  });
}

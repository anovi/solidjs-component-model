import {
  createApiServer,
  createWindowPostMessageTransport,
  type ApiDefinition,
  type ApiHandlers,
  type ApiServer,
  type ApiServerOptions,
} from "solid-component-model/rpc";

export interface MainWorldServerOptions<
  TApi extends ApiDefinition = ApiDefinition,
> extends ApiServerOptions<TApi> {
  targetWindow?: Window;
  targetOrigin?: string;
}

/**
 * Creates an ApiServer in the page's MAIN world wired with a window.postMessage transport.
 */
export function createMainWorldServer<TApi extends ApiDefinition>(
  initialHandlersOrOptions?:
    Partial<ApiHandlers<TApi>> | MainWorldServerOptions<TApi>,
  maybeOptions?: MainWorldServerOptions<TApi>
): ApiServer<TApi> {
  let handlers: Partial<ApiHandlers<TApi>> | undefined;
  let opts: MainWorldServerOptions<TApi> = {};

  if (
    initialHandlersOrOptions &&
    typeof initialHandlersOrOptions === "object"
  ) {
    if (
      "handlers" in initialHandlersOrOptions ||
      "transport" in initialHandlersOrOptions ||
      "source" in initialHandlersOrOptions ||
      "targetWindow" in initialHandlersOrOptions ||
      "serializeError" in initialHandlersOrOptions
    ) {
      opts = initialHandlersOrOptions as MainWorldServerOptions<TApi>;
      handlers = opts.handlers;
    } else {
      handlers = initialHandlersOrOptions as Partial<ApiHandlers<TApi>>;
      opts = maybeOptions ?? {};
    }
  }

  const source = opts.source ?? "devtools-rpc";
  const transport =
    opts.transport ??
    createWindowPostMessageTransport({
      source,
      targetWindow: opts.targetWindow,
      targetOrigin: opts.targetOrigin,
    });

  return createApiServer<TApi>({
    ...opts,
    source,
    handlers,
    transport,
  });
}

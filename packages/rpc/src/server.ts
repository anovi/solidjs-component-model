import type {
  ApiDefinition,
  ApiHandler,
  ApiHandlers,
  ApiMethod,
  ApiResult,
  ApiServer,
  ApiServerOptions,
  RpcRequestMessage,
  RpcResponseMessage,
} from "./types";

/**
 * Creates an ApiServer for registering API method handlers and processing incoming requests.
 *
 * @example
 * ```ts
 * interface MyApi {
 *   getUser: (id: string) => Promise<{ id: string; name: string }>;
 *   getVersion: () => string;
 * }
 *
 * const server = createApiServer<MyApi>();
 * server.registerAll({
 *   async getUser(id) {
 *     return { id, name: "Alice" };
 *   },
 *   getVersion() {
 *     return "1.0.0";
 *   },
 * });
 * ```
 */
export function createApiServer<TApi extends ApiDefinition>(
  initialHandlersOrOptions?:
    Partial<ApiHandlers<TApi>> | ApiServerOptions<TApi>,
  maybeOptions?: ApiServerOptions<TApi>
): ApiServer<TApi> {
  let handlersConfig: Partial<ApiHandlers<TApi>> | undefined;
  let options: ApiServerOptions<TApi> = {};

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
      options = initialHandlersOrOptions as ApiServerOptions<TApi>;
      handlersConfig = options.handlers;
    } else {
      handlersConfig = initialHandlersOrOptions as Partial<ApiHandlers<TApi>>;
      options = maybeOptions ?? {};
    }
  }

  const source = options.source ?? "rpc";
  const transport = options.transport;
  const handlers = new Map<
    string,
    (...args: unknown[]) => unknown | Promise<unknown>
  >();
  let isDestroyed = false;

  if (handlersConfig) {
    for (const [method, handler] of Object.entries(handlersConfig)) {
      if (typeof handler === "function") {
        handlers.set(
          method,
          handler as (...args: unknown[]) => unknown | Promise<unknown>
        );
      }
    }
  }

  function register<M extends ApiMethod<TApi>>(
    method: M,
    handler: ApiHandler<TApi, M>
  ): void {
    handlers.set(
      method,
      handler as (...args: unknown[]) => unknown | Promise<unknown>
    );
  }

  function registerAll(newHandlers: Partial<ApiHandlers<TApi>>): void {
    for (const [method, handler] of Object.entries(newHandlers)) {
      if (typeof handler === "function") {
        handlers.set(
          method,
          handler as (...args: unknown[]) => unknown | Promise<unknown>
        );
      }
    }
  }

  function unregister<M extends ApiMethod<TApi>>(method: M): boolean {
    return handlers.delete(method);
  }

  function has<M extends ApiMethod<TApi>>(method: M): boolean {
    return handlers.has(method);
  }

  function serializeError(error: unknown): { message: string; stack?: string } {
    if (options.serializeError) {
      return options.serializeError(error);
    }
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }
    return {
      message: String(error),
    };
  }

  async function handleRequest<M extends ApiMethod<TApi>>(
    request: RpcRequestMessage<TApi, M>
  ): Promise<RpcResponseMessage<TApi, M>> {
    if (isDestroyed) {
      return {
        source,
        kind: "response",
        id: request.id,
        method: request.method,
        error: "ApiServer was destroyed",
      };
    }

    const handler = handlers.get(request.method);
    if (!handler) {
      return {
        source,
        kind: "response",
        id: request.id,
        method: request.method,
        error: `No handler registered for method "${request.method}"`,
      };
    }

    try {
      const rawArgs = Array.isArray(request.args) ? request.args : [];
      const result = (await handler(...rawArgs)) as ApiResult<TApi, M>;
      return {
        source,
        kind: "response",
        id: request.id,
        method: request.method,
        result,
      };
    } catch (err) {
      const { message, stack } = serializeError(err);
      return {
        source,
        kind: "response",
        id: request.id,
        method: request.method,
        error: message,
        stack,
      };
    }
  }

  // Subscribe to transport if provided
  let unsubscribeTransport: (() => void) | undefined;
  if (transport && typeof transport.onMessage === "function") {
    const attachListener = transport.onMessage as (
      listener: (
        msg: unknown,
        respond?: (response: RpcResponseMessage<TApi, any>) => void
      ) => void
    ) => () => void;
    unsubscribeTransport = attachListener(
      async (
        msg: unknown,
        respond?: (response: RpcResponseMessage<TApi, any>) => void
      ) => {
        if (
          !msg ||
          typeof msg !== "object" ||
          ((msg as Partial<RpcRequestMessage>).source !== undefined &&
            (msg as Partial<RpcRequestMessage>).source !== source) ||
          (msg as Partial<RpcRequestMessage>).kind !== "request" ||
          typeof (msg as Partial<RpcRequestMessage>).id !== "string" ||
          typeof (msg as Partial<RpcRequestMessage>).method !== "string"
        ) {
          return;
        }

        const response = await handleRequest(
          msg as RpcRequestMessage<TApi, any>
        );
        if (respond) {
          respond(response);
        } else if (transport.send) {
          transport.send(response);
        }
      }
    );
  }

  function destroy(): void {
    isDestroyed = true;
    if (unsubscribeTransport) {
      unsubscribeTransport();
      unsubscribeTransport = undefined;
    }
    if (transport && typeof transport.destroy === "function") {
      transport.destroy();
    }
    handlers.clear();
  }

  return {
    register,
    registerAll,
    unregister,
    has,
    handleRequest,
    destroy,
  };
}

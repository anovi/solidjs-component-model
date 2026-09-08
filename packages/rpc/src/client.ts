import {
  RpcConnectionError,
  RpcExecutionError,
  RpcNoHandlerError,
  RpcTimeoutError,
} from "./errors";
import type {
  ApiClient,
  ApiClientOptions,
  ApiDefinition,
  ApiArgs,
  ApiMethod,
  ApiResult,
  RpcRequestMessage,
  RpcResponseMessage,
} from "./types";

interface PendingRequestEntry<T = unknown> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeoutTimer?: ReturnType<typeof setTimeout>;
  method: string;
}

/**
 * Creates an ApiClient instance for invoking typed remote methods on an ApiServer.
 *
 * @example
 * ```ts
 * interface MyApi {
 *   getUser: (id: string) => Promise<{ id: string; name: string }>;
 *   getVersion: () => string;
 * }
 *
 * const client = createApiClient<MyApi>({ transport });
 * const user = await client.request('getUser', '123');
 * ```
 */
export function createApiClient<TApi extends ApiDefinition>(
  options: ApiClientOptions = {}
): ApiClient<TApi> {
  const source = options.source ?? "rpc";
  const timeoutMs = options.timeout ?? 30000;
  const transport = options.transport;

  const pendingRequests = new Map<string, PendingRequestEntry<unknown>>();
  let isDestroyed = false;

  function generateId(): string {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  function handleResponse(response: unknown): boolean {
    if (!response || typeof response !== "object") {
      return false;
    }

    const msg = response as Partial<RpcResponseMessage>;
    if (
      (msg.source !== undefined && msg.source !== source) ||
      msg.kind !== "response" ||
      typeof msg.id !== "string"
    ) {
      return false;
    }

    const pending = pendingRequests.get(msg.id);
    if (!pending) {
      return false;
    }

    pendingRequests.delete(msg.id);
    if (pending.timeoutTimer) {
      clearTimeout(pending.timeoutTimer);
    }

    if (msg.error !== undefined) {
      if (
        typeof msg.error === "string" &&
        msg.error.startsWith("No handler registered for method")
      ) {
        pending.reject(new RpcNoHandlerError(pending.method));
      } else {
        pending.reject(
          new RpcExecutionError(msg.error, pending.method, msg.id, msg.stack)
        );
      }
    } else {
      pending.resolve(msg.result);
    }

    return true;
  }

  // Set up transport listener if supported
  let unsubscribeTransport: (() => void) | undefined;
  if (transport && typeof transport.onMessage === "function") {
    unsubscribeTransport = transport.onMessage(message => {
      handleResponse(message);
    });
  }

  function request<M extends ApiMethod<TApi>>(
    method: M,
    ...args: ApiArgs<TApi, M>
  ): Promise<ApiResult<TApi, M>> {
    if (isDestroyed) {
      return Promise.reject(new RpcConnectionError("ApiClient was destroyed"));
    }

    const id = generateId();
    const message: RpcRequestMessage<TApi, M> = {
      source,
      kind: "request",
      id,
      method,
      args,
    };

    return new Promise<ApiResult<TApi, M>>((resolve, reject) => {
      let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

      if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
        timeoutTimer = setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(
              new RpcTimeoutError(
                `Request for method "${String(method)}" timed out after ${timeoutMs}ms`,
                String(method),
                id,
                timeoutMs
              )
            );
          }
        }, timeoutMs);
      }

      pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutTimer,
        method: String(method),
      });

      // Custom send function option
      if (options.send) {
        try {
          const sendResult = options.send(message);
          if (
            sendResult &&
            typeof (sendResult as Promise<unknown>).then === "function"
          ) {
            (sendResult as Promise<RpcResponseMessage | void>)
              .then(resp => {
                if (resp) {
                  handleResponse(resp);
                }
              })
              .catch(err => {
                if (pendingRequests.has(id)) {
                  pendingRequests.delete(id);
                  if (timeoutTimer) clearTimeout(timeoutTimer);
                  reject(
                    err instanceof Error
                      ? err
                      : new RpcConnectionError(String(err))
                  );
                }
              });
          }
        } catch (err) {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            if (timeoutTimer) clearTimeout(timeoutTimer);
            reject(
              err instanceof Error ? err : new RpcConnectionError(String(err))
            );
          }
        }
        return;
      }

      // Configured transport
      if (transport) {
        try {
          const sendResult = transport.send(message);
          if (
            sendResult &&
            typeof (sendResult as Promise<unknown>).then === "function"
          ) {
            (sendResult as Promise<RpcResponseMessage | void>)
              .then(resp => {
                if (resp) {
                  handleResponse(resp);
                }
              })
              .catch(err => {
                if (pendingRequests.has(id)) {
                  pendingRequests.delete(id);
                  if (timeoutTimer) clearTimeout(timeoutTimer);
                  reject(
                    err instanceof Error
                      ? err
                      : new RpcConnectionError(String(err))
                  );
                }
              });
          }
        } catch (err) {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            if (timeoutTimer) clearTimeout(timeoutTimer);
            reject(
              err instanceof Error ? err : new RpcConnectionError(String(err))
            );
          }
        }
        return;
      }

      // No transport or send provided
      pendingRequests.delete(id);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      reject(
        new RpcConnectionError(
          "No transport or send function configured on ApiClient"
        )
      );
    });
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

    for (const [, pending] of pendingRequests) {
      if (pending.timeoutTimer) {
        clearTimeout(pending.timeoutTimer);
      }
      pending.reject(new RpcConnectionError("ApiClient was destroyed"));
    }
    pendingRequests.clear();
  }

  return {
    request,
    destroy,
  };
}

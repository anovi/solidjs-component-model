/**
 * Generic API definition mapping method names to their handler function signatures.
 * Can be either a TypeScript `interface` or `type` alias.
 *
 * @example
 * ```ts
 * export interface MyApi {
 *   getValue: () => string;
 *   getUser: (id: string) => Promise<{ id: string; name: string }>;
 *   calculate: (a: number, b: number) => number;
 * }
 * ```
 */
export type ApiDefinition = object;

/**
 * Method names available in the API definition.
 */
export type ApiMethod<TApi extends ApiDefinition> = keyof TApi & string;

/**
 * Argument tuple for a given API method.
 */
export type ApiArgs<
  TApi extends ApiDefinition,
  M extends ApiMethod<TApi>,
> = TApi[M] extends (...args: infer P) => any ? P : any[];

/**
 * Return type (unwrapped if Promise) for a given API method.
 */
export type ApiResult<
  TApi extends ApiDefinition,
  M extends ApiMethod<TApi>,
> = TApi[M] extends (...args: any[]) => infer R ? Awaited<R> : any;

/**
 * Handler function signature for a given API method.
 * Can return the result value directly or wrapped in a Promise.
 */
export type ApiHandler<
  TApi extends ApiDefinition,
  M extends ApiMethod<TApi>,
> = (
  ...args: ApiArgs<TApi, M>
) => ApiResult<TApi, M> | Promise<ApiResult<TApi, M>>;

/**
 * Map of handlers implementing the API definition.
 */
export type ApiHandlers<TApi extends ApiDefinition> = {
  [M in ApiMethod<TApi>]: ApiHandler<TApi, M>;
};

/**
 * Wire format for a request message sent across contexts.
 */
export interface RpcRequestMessage<
  TApi extends ApiDefinition = any,
  M extends ApiMethod<TApi> = ApiMethod<TApi>,
> {
  source?: string;
  kind: "request";
  id: string;
  method: M;
  args: ApiArgs<TApi, M>;
}

/**
 * Wire format for a successful response message.
 */
export interface RpcSuccessResponse<
  TApi extends ApiDefinition = any,
  M extends ApiMethod<TApi> = ApiMethod<TApi>,
> {
  source?: string;
  kind: "response";
  id: string;
  method: M;
  result: ApiResult<TApi, M>;
  error?: never;
}

/**
 * Wire format for an error response message.
 */
export interface RpcErrorResponse<
  TApi extends ApiDefinition = any,
  M extends ApiMethod<TApi> = ApiMethod<TApi>,
> {
  source?: string;
  kind: "response";
  id: string;
  method: M;
  result?: never;
  error: string;
  stack?: string;
}

/**
 * Wire format for any response message (success or error).
 */
export type RpcResponseMessage<
  TApi extends ApiDefinition = any,
  M extends ApiMethod<TApi> = ApiMethod<TApi>,
> = RpcSuccessResponse<TApi, M> | RpcErrorResponse<TApi, M>;

/**
 * Union of all RPC messages on the wire.
 */
export type RpcMessage<TApi extends ApiDefinition = any> =
  RpcRequestMessage<TApi> | RpcResponseMessage<TApi>;

/**
 * Generic bidirectional message transport.
 */
export interface MessageTransport {
  send: (message: RpcMessage) => Promise<void | RpcResponseMessage> | void;
  onMessage: (listener: (message: RpcMessage) => void) => () => void;
  destroy?: () => void;
}

/**
 * Transport used by ApiClient to send requests and listen for responses.
 */
export interface ClientTransport {
  send: (
    message: RpcRequestMessage
  ) => Promise<RpcResponseMessage | void> | void;
  onMessage?: (listener: (message: RpcResponseMessage) => void) => () => void;
  destroy?: () => void;
}

/**
 * Transport used by ApiServer to receive requests and send responses.
 */
export interface ServerTransport {
  send: (message: RpcResponseMessage) => Promise<void> | void;
  onMessage?: (
    listener: (
      message: RpcRequestMessage,
      respond?: (response: RpcResponseMessage) => void
    ) => void
  ) => () => void;
  destroy?: () => void;
}

/**
 * Options for configuring an ApiClient.
 */
export interface ApiClientOptions {
  /**
   * Transport instance or custom send function.
   */
  transport?: ClientTransport | MessageTransport;

  /**
   * Optional custom send function (shorthand for single-function transport).
   */
  send?: (
    message: RpcRequestMessage
  ) => Promise<RpcResponseMessage | void> | void;

  /**
   * Namespace identifier to distinguish RPC messages and avoid collisions.
   * @default "rpc"
   */
  source?: string;

  /**
   * Request timeout in milliseconds. Set to 0 or Infinity to disable.
   * @default 30000
   */
  timeout?: number;
}

/**
 * Client interface for making typed RPC calls.
 */
export interface ApiClient<TApi extends ApiDefinition> {
  /**
   * Request a method call from the ApiServer.
   *
   * @param method The API method name to call
   * @param args The typed arguments required by the method
   * @returns A promise resolving to the typed result
   */
  request: <M extends ApiMethod<TApi>>(
    method: M,
    ...args: ApiArgs<TApi, M>
  ) => Promise<ApiResult<TApi, M>>;

  /**
   * Destroy the client instance, rejecting all pending requests.
   */
  destroy: () => void;
}

/**
 * Options for configuring an ApiServer.
 */
export interface ApiServerOptions<TApi extends ApiDefinition = ApiDefinition> {
  /**
   * Initial handlers to register.
   */
  handlers?: Partial<ApiHandlers<TApi>>;

  /**
   * Transport instance for listening to requests and sending responses.
   */
  transport?: ServerTransport | MessageTransport;

  /**
   * Namespace identifier matching the client source.
   * @default "rpc"
   */
  source?: string;

  /**
   * Optional custom error serializer.
   */
  serializeError?: (error: unknown) => { message: string; stack?: string };
}

/**
 * Server interface for registering API handlers and executing requests.
 */
export interface ApiServer<TApi extends ApiDefinition> {
  /**
   * Register a handler for a single method.
   */
  register: <M extends ApiMethod<TApi>>(
    method: M,
    handler: ApiHandler<TApi, M>
  ) => void;

  /**
   * Register multiple handlers at once.
   */
  registerAll: (handlers: Partial<ApiHandlers<TApi>>) => void;

  /**
   * Unregister a handler for a method.
   */
  unregister: <M extends ApiMethod<TApi>>(method: M) => boolean;

  /**
   * Check if a handler is registered for a method.
   */
  has: <M extends ApiMethod<TApi>>(method: M) => boolean;

  /**
   * Directly handle a request message and return a response message.
   */
  handleRequest: (
    request: RpcRequestMessage<TApi, any>
  ) => Promise<RpcResponseMessage<TApi, any>>;

  /**
   * Destroy the server instance and clear all handlers/listeners.
   */
  destroy: () => void;
}

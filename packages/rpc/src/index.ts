// Core Types & Interfaces
export type {
  ApiDefinition,
  ApiMethod,
  ApiArgs,
  ApiResult,
  ApiHandler,
  ApiHandlers,
  RpcRequestMessage,
  RpcSuccessResponse,
  RpcErrorResponse,
  RpcResponseMessage,
  RpcMessage,
  ApiClient,
  ApiClientOptions,
  ApiServer,
  ApiServerOptions,
  MessageTransport,
  ClientTransport,
  ServerTransport,
} from "./types";

// Errors
export {
  RpcError,
  RpcTimeoutError,
  RpcExecutionError,
  RpcConnectionError,
  RpcNoHandlerError,
} from "./errors";

// Factories
export { createApiClient } from "./client";
export { createApiServer } from "./server";

// Transports
export {
  createLocalTransportPair,
  createDirectClientTransport,
  createMemoryTransport,
  createWindowPostMessageTransport,
  type WindowPostMessageTransportOptions,
} from "./transports";

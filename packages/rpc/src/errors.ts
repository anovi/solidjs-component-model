/**
 * Base error class for all RPC errors.
 */
export class RpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RpcError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a request times out before receiving a response.
 */
export class RpcTimeoutError extends RpcError {
  readonly method: string;
  readonly id: string;
  readonly timeoutMs: number;

  constructor(message: string, method: string, id: string, timeoutMs: number) {
    super(message);
    this.name = "RpcTimeoutError";
    this.method = method;
    this.id = id;
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an error occurs during execution of a handler on the ApiServer.
 */
export class RpcExecutionError extends RpcError {
  readonly method: string;
  readonly id: string;
  readonly remoteStack?: string;

  constructor(
    message: string,
    method: string,
    id: string,
    remoteStack?: string
  ) {
    super(message);
    this.name = "RpcExecutionError";
    this.method = method;
    this.id = id;
    this.remoteStack = remoteStack;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when communication/transport fails or client/server was destroyed.
 */
export class RpcConnectionError extends RpcError {
  constructor(message: string) {
    super(message);
    this.name = "RpcConnectionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when no handler is registered for the requested method on the ApiServer.
 */
export class RpcNoHandlerError extends RpcError {
  readonly method: string;

  constructor(method: string) {
    super(`No handler registered for method "${method}"`);
    this.name = "RpcNoHandlerError";
    this.method = method;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

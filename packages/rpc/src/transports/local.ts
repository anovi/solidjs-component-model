import type {
  ClientTransport,
  MessageTransport,
  RpcMessage,
  RpcRequestMessage,
  RpcResponseMessage,
  ServerTransport,
  ApiServer,
  ApiDefinition,
} from "../types";

/**
 * Creates an in-memory transport pair connecting a client transport and a server transport.
 * Messages are dispatched asynchronously (via microtasks) to simulate process boundary.
 */
export function createLocalTransportPair(): {
  clientTransport: ClientTransport;
  serverTransport: ServerTransport;
} {
  let clientListeners: Array<(msg: RpcResponseMessage) => void> = [];
  let serverListeners: Array<
    (
      msg: RpcRequestMessage,
      respond?: (resp: RpcResponseMessage) => void
    ) => void
  > = [];

  const clientTransport: ClientTransport = {
    send(message: RpcRequestMessage) {
      queueMicrotask(() => {
        for (const listener of [...serverListeners]) {
          listener(message, response => {
            queueMicrotask(() => {
              for (const cl of [...clientListeners]) {
                cl(response);
              }
            });
          });
        }
      });
    },
    onMessage(listener) {
      clientListeners.push(listener);
      return () => {
        clientListeners = clientListeners.filter(l => l !== listener);
      };
    },
    destroy() {
      clientListeners = [];
    },
  };

  const serverTransport: ServerTransport = {
    send(message: RpcResponseMessage) {
      queueMicrotask(() => {
        for (const listener of [...clientListeners]) {
          listener(message);
        }
      });
    },
    onMessage(listener) {
      serverListeners.push(listener);
      return () => {
        serverListeners = serverListeners.filter(l => l !== listener);
      };
    },
    destroy() {
      serverListeners = [];
    },
  };

  return { clientTransport, serverTransport };
}

/**
 * Creates a ClientTransport that directly invokes an ApiServer's `handleRequest` method.
 * Ideal for running in-process tests or embedding without transport overhead.
 */
export function createDirectClientTransport<
  TApi extends ApiDefinition = ApiDefinition,
>(server: ApiServer<TApi>): ClientTransport {
  return {
    async send(message: RpcRequestMessage) {
      return server.handleRequest(message as RpcRequestMessage<TApi, any>);
    },
  };
}

/**
 * Creates a simple in-memory broadcast MessageTransport.
 */
export function createMemoryTransport(): MessageTransport {
  let listeners: Array<(msg: RpcMessage) => void> = [];

  return {
    send(message: RpcMessage) {
      queueMicrotask(() => {
        for (const listener of [...listeners]) {
          listener(message);
        }
      });
    },
    onMessage(listener) {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter(l => l !== listener);
      };
    },
    destroy() {
      listeners = [];
    },
  };
}

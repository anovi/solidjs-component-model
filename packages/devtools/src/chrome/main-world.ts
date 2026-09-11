import {
  createApiServer,
  ServerTransport,
  type ApiServer,
  type ClientMessages,
} from "@solid-component-model/rpc";

/**
 * Creates a ClientTransport that communicates with the inspected tab via Chrome extension APIs.
 */
export function createChromeMainWorldTransport(): ServerTransport {
  // const listeners = new Map<string, Set<(message: RpcMessage) => void>>();

  return {
    send: message => {
      window.postMessage(message);
    },
    onConnected(cb) {
      window.addEventListener("message", msg => {
        if (
          msg.data.type === "CLIENT_CONNECTED" &&
          msg.data.source === "scm-devtools"
        ) {
          console.log(msg);
          cb();
        }
      });
    },
    onDisonnected(cb) {
      window.addEventListener("message", msg => {
        if (
          msg.data.type === "CLIENT_DISCONNECTED" &&
          msg.data.type === "scm-devtools"
        ) {
          cb();
        }
      });
    },
    onMessage: (type, listener) => {
      const _listener = (message: MessageEvent<ClientMessages>) => {
        if (message.data.type === type) {
          console.log("🟢 matched: ", message.data);
          listener(message.data as any);
        }
      };
      window.addEventListener("message", _listener);
      return {
        unsubscribe: () => window.removeEventListener("message", _listener),
      };
    },
    destroy: () => {
      // listeners.clear();
    },
  };
}

/**
 * Creates an ApiServer in the page's MAIN world wired with a window.postMessage transport.
 */
export function createMainWorldServer(): ApiServer {
  const transport = createChromeMainWorldTransport();
  return createApiServer(transport);
}

import {
  createApiServer,
  ServerTransport,
  type ApiServer,
  type ClientMessages,
} from "@solid-component-model/rpc";
import { appChannel, MESSAGE_FROM_CLIENT, MESSAGE_FROM_SERVER } from "./target";

export function createLocalServerTransport(): ServerTransport {
  return {
    send: message => {
      appChannel.dispatchEvent(
        new CustomEvent(MESSAGE_FROM_SERVER, { detail: message })
      );
    },
    onConnected(cb) {
      queueMicrotask(cb);
    },
    onDisonnected(cb) {
      queueMicrotask(cb);
    },
    onMessage: (type, listener) => {
      const _listener = (message: CustomEvent<ClientMessages>) => {
        if (
          message.type === MESSAGE_FROM_CLIENT &&
          message.detail.type === type
        ) {
          console.log("[SERVER]: ", message.detail);
          listener(message.detail as any);
        }
      };
      appChannel.addEventListener(MESSAGE_FROM_CLIENT, _listener as any);
      return {
        unsubscribe: () =>
          window.removeEventListener(MESSAGE_FROM_CLIENT, _listener as any),
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
export function createLocalServer(): ApiServer {
  const transport = createLocalServerTransport();
  return createApiServer(transport);
}

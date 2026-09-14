import {
  createApiServer,
  ServerTransport,
  type ApiServer,
  type ClientMessages,
} from "@solid-component-model/rpc";
import { appChannel, MESSAGE_FROM_CLIENT, MESSAGE_FROM_SERVER } from "./target";

export function createLocalServerTransport(): ServerTransport {
  const ConnectListeners = new Set<(...args: any[]) => any>();
  const DisconnectListeners = new Set<(...args: any[]) => any>();
  let connected = false;

  const server: ServerTransport = {
    send: message => {
      appChannel.dispatchEvent(
        new CustomEvent(MESSAGE_FROM_SERVER, { detail: message })
      );
    },
    onConnected(cb) {
      ConnectListeners.add(cb);
    },
    onDisonnected(cb) {
      DisconnectListeners.add(cb);
    },
    onMessage: (type, listener) => {
      const _listener = (message: CustomEvent<ClientMessages>) => {
        if (
          message.type === MESSAGE_FROM_CLIENT &&
          message.detail.type === type
        ) {
          // console.log("[SERVER]: ", message.detail);
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

  server.onMessage("CONNECT", () => {
    connected = true;
    ConnectListeners.forEach(cb => cb());
    server.send({ type: "CONNECTED" });
  });

  void connected;

  return server;
}

/**
 * Creates an ApiServer in the page's MAIN world wired with a window.postMessage transport.
 */
export function createLocalServer(): ApiServer {
  const transport = createLocalServerTransport();
  return createApiServer(transport);
}

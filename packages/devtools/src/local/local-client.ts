/// <reference types="chrome" />

import {
  ClientMessages,
  createApiClient,
  type ApiClient,
  type ClientTransport,
  type ServerMessages,
} from "@solid-component-model/rpc";
import { appChannel, MESSAGE_FROM_CLIENT, MESSAGE_FROM_SERVER } from "./target";

export interface LocalPanelTransportOptions {
  /**
   * Source identifier matching the devtools rpc messages.
   * @default "devtools-rpc"
   */
  source?: string;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;
}

/**
 * Creates a ClientTransport that communicates with the inspected tab via Chrome extension APIs.
 */
export function createLocalPanelTransport(): ClientTransport {
  const listeners = new Map<string, Set<(...args: any[]) => any>>();

  const localClientTransport: ClientTransport = {
    connect() {
      return new Promise(done => {
        appChannel.addEventListener(MESSAGE_FROM_SERVER, ((
          message: CustomEvent<ServerMessages>
        ) => {
          if (message.detail.type === "CONNECTED") {
            done();
          }
        }) as any);
        const msg: ClientMessages = { type: "CONNECT" };
        appChannel.dispatchEvent(
          new CustomEvent(MESSAGE_FROM_CLIENT, { detail: msg })
        );
      });
    },
    send: message => {
      appChannel.dispatchEvent(
        new CustomEvent(MESSAGE_FROM_CLIENT, { detail: message })
      );
    },
    onConnected(cb) {
      queueMicrotask(cb);
    },
    onDisonnected(cb) {
      queueMicrotask(cb);
    },
    onMessage: (type, listener) => {
      const _listener = (message: CustomEvent<ServerMessages>) => {
        if (
          message.type === MESSAGE_FROM_SERVER &&
          message.detail.type === type
        ) {
          // console.log("[CLIENT]: ", message.detail);
          listener(message.detail as any);
        }
      };
      appChannel.addEventListener(MESSAGE_FROM_SERVER, _listener as any);
      return {
        unsubscribe: () =>
          window.removeEventListener(MESSAGE_FROM_SERVER, _listener as any),
      };
    },
    destroy: () => {
      for (const [type, list] of listeners.entries()) {
        list.forEach(listener =>
          window.removeEventListener("message", listener)
        );
        void type;
      }
    },
  };

  return localClientTransport;
}

/**
 * Creates an ApiClient configured to communicate with the inspected tab's MAIN world via Chrome DevTools.
 */
export function createLocalPanelClient(): ApiClient {
  const transport = createLocalPanelTransport();
  return createApiClient(transport);
}

/// <reference types="chrome" />

import {
  createApiClient,
  type ApiClient,
  type ApiDefinition,
  type ClientTransport,
  type RpcRequestMessage,
  type RpcResponseMessage,
} from "solid-component-model/rpc";

export interface ChromePanelTransportOptions {
  /**
   * Source identifier matching the devtools rpc messages.
   * @default "devtools-rpc"
   */
  source?: string;

  /**
   * Target tab ID. If omitted, attempts to read `chrome.devtools.inspectedWindow.tabId`.
   */
  tabId?: number | (() => number | undefined);

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;
}

/**
 * Creates a ClientTransport that communicates with the inspected tab via Chrome extension APIs.
 */
export function createChromePanelTransport(
  options: ChromePanelTransportOptions = {}
): ClientTransport {
  const source = options.source ?? "devtools-rpc";

  function resolveTabId(): number | undefined {
    if (typeof options.tabId === "number") {
      return options.tabId;
    }
    if (typeof options.tabId === "function") {
      return options.tabId();
    }
    if (
      typeof chrome !== "undefined" &&
      chrome.devtools &&
      chrome.devtools.inspectedWindow &&
      typeof chrome.devtools.inspectedWindow.tabId === "number"
    ) {
      return chrome.devtools.inspectedWindow.tabId;
    }
    return undefined;
  }

  let listeners: Array<(msg: RpcResponseMessage) => void> = [];

  const runtimeMessageListener = (message: unknown) => {
    if (
      message &&
      typeof message === "object" &&
      (message as Partial<RpcResponseMessage>).source === source &&
      (message as Partial<RpcResponseMessage>).kind === "response"
    ) {
      for (const listener of [...listeners]) {
        listener(message as RpcResponseMessage);
      }
    }
  };

  if (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.onMessage &&
    typeof chrome.runtime.onMessage.addListener === "function"
  ) {
    chrome.runtime.onMessage.addListener(runtimeMessageListener);
  }

  return {
    send(message: RpcRequestMessage) {
      const tabId = resolveTabId();

      return new Promise<RpcResponseMessage | void>((resolve, reject) => {
        const onCallback = (response: unknown) => {
          if (typeof chrome !== "undefined" && chrome.runtime?.lastError) {
            reject(
              new Error(
                chrome.runtime.lastError.message ||
                  "Chrome runtime error sending message"
              )
            );
            return;
          }
          if (response) {
            resolve(response as RpcResponseMessage);
          } else {
            resolve();
          }
        };

        if (
          typeof tabId === "number" &&
          typeof chrome !== "undefined" &&
          chrome.tabs &&
          typeof chrome.tabs.sendMessage === "function"
        ) {
          chrome.tabs.sendMessage(tabId, message, onCallback);
        } else if (
          typeof chrome !== "undefined" &&
          chrome.runtime &&
          typeof chrome.runtime.sendMessage === "function"
        ) {
          chrome.runtime.sendMessage(message, onCallback);
        } else {
          reject(
            new Error(
              "No messaging channel available. chrome.tabs or chrome.runtime is missing."
            )
          );
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
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.onMessage &&
        typeof chrome.runtime.onMessage.removeListener === "function"
      ) {
        try {
          chrome.runtime.onMessage.removeListener(runtimeMessageListener);
        } catch {
          // ignore
        }
      }
      listeners = [];
    },
  };
}

/**
 * Creates an ApiClient configured to communicate with the inspected tab's MAIN world via Chrome DevTools.
 */
export function createChromePanelClient<TApi extends ApiDefinition>(
  options: ChromePanelTransportOptions = {}
): ApiClient<TApi> {
  const transport = createChromePanelTransport(options);
  return createApiClient<TApi>({
    transport,
    source: options.source ?? "devtools-rpc",
    timeout: options.timeout,
  });
}

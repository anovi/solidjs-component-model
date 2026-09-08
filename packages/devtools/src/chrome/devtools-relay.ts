/// <reference types="chrome" />

import type { RpcRequestMessage } from "@solid-component-model/rpc";

export interface ChromeDevToolsRelayOptions {
  /**
   * Source identifier matching the devtools rpc messages.
   * @default "devtools-rpc"
   */
  source?: string;

  /**
   * Target tab ID. If omitted, attempts to read `chrome.devtools.inspectedWindow.tabId`.
   */
  tabId?: number | (() => number | undefined);
}

export interface ChromeDevToolsRelay {
  destroy: () => void;
}

/**
 * Creates a DevTools Relay (run in devtools page or background service worker)
 * that forwards runtime messages from the panel to the inspected tab's content script.
 */
export function createChromeDevToolsRelay(
  options: ChromeDevToolsRelayOptions = {}
): ChromeDevToolsRelay {
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

  const listener = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): boolean | void => {
    if (
      !message ||
      typeof message !== "object" ||
      (message as Partial<RpcRequestMessage>).source !== source ||
      (message as Partial<RpcRequestMessage>).kind !== "request"
    ) {
      return;
    }

    const tabId = resolveTabId();
    if (
      typeof tabId !== "number" ||
      typeof chrome === "undefined" ||
      !chrome.tabs ||
      typeof chrome.tabs.sendMessage !== "function"
    ) {
      sendResponse({
        source,
        kind: "response",
        id: (message as RpcRequestMessage).id,
        method: (message as RpcRequestMessage).method,
        error: "ChromeDevToolsRelay: inspected tabId is not available",
      });
      return;
    }

    chrome.tabs.sendMessage(tabId, message, response => {
      if (chrome.runtime?.lastError) {
        sendResponse({
          source,
          kind: "response",
          id: (message as RpcRequestMessage).id,
          method: (message as RpcRequestMessage).method,
          error:
            chrome.runtime.lastError.message ||
            "Failed to send message to inspected tab",
        });
        return;
      }
      sendResponse(response);
    });

    return true;
  };

  if (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.onMessage &&
    typeof chrome.runtime.onMessage.addListener === "function"
  ) {
    chrome.runtime.onMessage.addListener(listener);
  }

  function destroy(): void {
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.onMessage &&
      typeof chrome.runtime.onMessage.removeListener === "function"
    ) {
      try {
        chrome.runtime.onMessage.removeListener(listener);
      } catch {
        // ignore
      }
    }
  }

  return { destroy };
}

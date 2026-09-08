/// <reference types="chrome" />

import type {
  RpcRequestMessage,
  RpcResponseMessage,
} from "solid-component-model/rpc";

export interface ChromeContentRelayOptions {
  /**
   * Source identifier matching the devtools rpc messages.
   * @default "devtools-rpc"
   */
  source?: string;

  /**
   * Target Window to listen for messages on and post requests to.
   * @default window
   */
  targetWindow?: Window;

  /**
   * Target origin for window.postMessage.
   * @default "*"
   */
  targetOrigin?: string;

  /**
   * Timeout in ms for cleaning up abandoned pending callbacks in the isolated world.
   * @default 60000
   */
  timeout?: number;
}

export interface ChromeContentRelay {
  destroy: () => void;
}

interface PendingEntry {
  callback: (response: RpcResponseMessage) => void;
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * Creates an ISOLATED world relay (Content Script) that bridges messages
 * between Chrome extension messaging (`chrome.runtime.onMessage`) and the page's MAIN world (`window.postMessage`).
 */
export function createChromeContentRelay(
  options: ChromeContentRelayOptions = {}
): ChromeContentRelay {
  const source = options.source ?? "devtools-rpc";
  const targetWin =
    options.targetWindow ??
    (typeof window !== "undefined" ? window : undefined);
  const targetOrigin = options.targetOrigin ?? "*";
  const timeoutMs = options.timeout ?? 60000;

  const pending = new Map<string, PendingEntry>();

  // Listen for responses posted back from the MAIN world via window.postMessage
  const windowListener = (event: MessageEvent) => {
    if (targetWin && event.source !== targetWin) {
      return;
    }

    const data = event.data;
    if (
      !data ||
      typeof data !== "object" ||
      data.source !== source ||
      data.kind !== "response" ||
      typeof data.id !== "string"
    ) {
      return;
    }

    const response = data as RpcResponseMessage;
    const entry = pending.get(response.id);

    if (entry) {
      pending.delete(response.id);
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      entry.callback(response);
    }
  };

  if (targetWin && typeof targetWin.addEventListener === "function") {
    targetWin.addEventListener("message", windowListener);
  }

  // Listen for request messages coming from DevTools Panel or Relay
  const runtimeListener = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): boolean | void => {
    if (
      !message ||
      typeof message !== "object" ||
      (message as Partial<RpcRequestMessage>).source !== source ||
      (message as Partial<RpcRequestMessage>).kind !== "request" ||
      typeof (message as Partial<RpcRequestMessage>).id !== "string"
    ) {
      return;
    }

    const request = message as RpcRequestMessage;
    const id = request.id;

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
      timer = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
        }
      }, timeoutMs);
    }

    pending.set(id, {
      callback: response => {
        sendResponse(response);
      },
      timer,
    });

    // Forward request into page's MAIN world
    targetWin?.postMessage(request, targetOrigin);

    return true; // Keep sendResponse open for async response
  };

  if (
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    chrome.runtime.onMessage &&
    typeof chrome.runtime.onMessage.addListener === "function"
  ) {
    chrome.runtime.onMessage.addListener(runtimeListener);
  }

  function destroy(): void {
    if (targetWin && typeof targetWin.removeEventListener === "function") {
      targetWin.removeEventListener("message", windowListener);
    }

    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.onMessage &&
      typeof chrome.runtime.onMessage.removeListener === "function"
    ) {
      try {
        chrome.runtime.onMessage.removeListener(runtimeListener);
      } catch {
        // ignore
      }
    }

    for (const [, entry] of pending) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
    }
    pending.clear();
  }

  return { destroy };
}

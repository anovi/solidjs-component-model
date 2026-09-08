import type { MessageTransport, RpcMessage } from "../types";

export interface WindowPostMessageTransportOptions {
  /** Target Window to listen on and post messages to (default: global window). */
  targetWindow?: Window;
  /** Target origin for postMessage (default: "*"). */
  targetOrigin?: string;
  /** Namespace identifier (default: "rpc"). */
  source?: string;
}

/**
 * Creates a MessageTransport backed by window.postMessage and window.addEventListener("message").
 */
export function createWindowPostMessageTransport(
  options: WindowPostMessageTransportOptions = {}
): MessageTransport {
  const source = options.source ?? "rpc";
  const targetWin =
    options.targetWindow ??
    (typeof window !== "undefined" ? window : undefined);
  const targetOrigin = options.targetOrigin ?? "*";

  let listeners: Array<(msg: RpcMessage) => void> = [];

  const handleMessage = (event: MessageEvent) => {
    if (targetWin && event.source && event.source !== targetWin) {
      return;
    }

    const data = event.data;
    if (
      !data ||
      typeof data !== "object" ||
      (data.source !== undefined && data.source !== source) ||
      (data.kind !== "request" && data.kind !== "response") ||
      typeof data.id !== "string"
    ) {
      return;
    }

    const msg = data as RpcMessage;
    for (const listener of [...listeners]) {
      listener(msg);
    }
  };

  if (targetWin && typeof targetWin.addEventListener === "function") {
    targetWin.addEventListener("message", handleMessage);
  }

  return {
    send(message: RpcMessage) {
      const payload = {
        ...message,
        source: message.source ?? source,
      };
      targetWin?.postMessage(payload, targetOrigin);
    },
    onMessage(listener) {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter(l => l !== listener);
      };
    },
    destroy() {
      if (targetWin && typeof targetWin.removeEventListener === "function") {
        targetWin.removeEventListener("message", handleMessage);
      }
      listeners = [];
    },
  };
}

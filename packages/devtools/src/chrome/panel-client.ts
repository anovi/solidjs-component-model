/// <reference types="chrome" />

import {
  createApiClient,
  type ApiClient,
  type ClientTransport,
} from "@solid-component-model/rpc";

export type ChromeLogger = {
  log: (entry: string) => void;
  error: (error: string) => void;
  warn: (error: string) => void;
  clear: () => void;
};

async function injectScripts() {
  const tabId = chrome.devtools.inspectedWindow.tabId;
  if (chrome.scripting) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-isolated.js"],
      world: "ISOLATED",
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-main.js"],
      world: "MAIN",
    });
  }
}

enum State {
  IDLE = 0,
  CONNECTING = 1,
  FAILED = 2,
  RETRY = 3,
  OK = 4,
  DISCONNECTED = 5,
}

async function time(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Creates a ClientTransport that communicates with the inspected tab via Chrome extension APIs.
 */
export async function createChromePanelTransport(
  logger: ChromeLogger
): Promise<ClientTransport> {
  let port: chrome.runtime.Port | undefined;
  let destroyed = false;
  let attemts = 0;
  let state: State = State.IDLE;
  const tabId = chrome.devtools.inspectedWindow.tabId;

  const onNavigated = (url: string) => {
    logger.log("The page was reloaded or navigated to: " + url);
  };
  chrome.devtools.network.onNavigated.addListener(onNavigated);

  async function initialize() {
    attemts = 0;
    if (destroyed) return;
    await injectScripts();
    while (!destroyed && state !== State.OK)
      switch (state) {
        case State.IDLE:
          state = State.CONNECTING;
          break;
        case State.CONNECTING:
          try {
            attemts++;
            connect();
            state = State.OK;
          } catch (error) {
            console.error("[transport] connection attempt failed", error);
            logger.log("Error: " + error);
            state = State.FAILED;
          }
          break;
        case State.FAILED:
          if (attemts > 30) {
            console.error("[transport] retry limit reached");
            logger.log("Unable to connect!");
            throw "Unable to connect!";
          }
          state = State.RETRY;
          break;
        case State.RETRY:
          await time(1000);
          state = State.CONNECTING;
          break;
        case State.DISCONNECTED:
          await time(1000);
          state = State.CONNECTING;
          break;
      }
  }

  function connect() {
    port = chrome.tabs.connect(tabId, { name: "panel-page" });
    logger.log("🔌 Connected!");
    subscribeToPort();
    console.log("[devtools client] connected");
    ConnectedListeners.forEach(cb => cb());
    return port;
  }

  function subscribeToPort() {
    const currentPort = port!;
    currentPort.onDisconnect.addListener(() => {
      if (destroyed || port !== currentPort) return;
      port = undefined;
      state = State.DISCONNECTED;
      logger.log("page connection disconnected");
      console.log("[devtools client] disconnected");
      DisconnectListeners.forEach(cb => cb());
      void initialize().catch(error => {
        console.error("[transport] reconnect failed", error);
        logger.error(String(error));
      });
    });
    currentPort.onMessage.addListener((message: Event) => {
      if (destroyed || port !== currentPort) return;
      const listeners = MessageListeners.get(message.type);
      if (listeners) {
        listeners.forEach(cb => {
          cb(message);
        });
      }
    });
  }

  const DisconnectListeners = new Set<() => void>();
  const ConnectedListeners = new Set<() => void>();
  const MessageListeners = new Map<string, Set<(...arg: any[]) => void>>();

  const transport: ClientTransport = {
    connect() {
      return initialize();
    },
    send: message => {
      port?.postMessage(message);
    },
    onConnected(cb) {
      if (state === State.OK) cb();
      ConnectedListeners.add(cb);
    },
    onDisonnected(cb) {
      DisconnectListeners.add(cb);
    },
    onMessage: (type, listener) => {
      const listeners = MessageListeners.get(type) || new Set();
      listeners.add(listener);
      MessageListeners.set(type, listeners);
      return {
        unsubscribe: () => {
          MessageListeners.get(type)?.delete(listener);
        },
      };
    },
    destroy: () => {
      logger.log("[transport] Destroying");
      destroyed = true;
      chrome.devtools.network.onNavigated.removeListener(onNavigated);
      port?.disconnect();
      port = undefined;
      DisconnectListeners.clear();
      ConnectedListeners.clear();
      MessageListeners.clear();
    },
  };

  return transport;
}

/**
 * Creates an ApiClient configured to communicate with the inspected tab's MAIN world via Chrome DevTools.
 */
export async function createChromePanelClient(
  loger: ChromeLogger
): Promise<ApiClient> {
  const transport = await createChromePanelTransport(loger);
  return createApiClient(transport);
}

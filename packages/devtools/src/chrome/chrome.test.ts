import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createChromePanelClient,
  createChromeContentRelay,
  createChromeDevToolsRelay,
  createMainWorldServer,
  type ChromeContentRelay,
} from "./index";
import {
  RpcExecutionError,
  RpcNoHandlerError,
  RpcTimeoutError,
  type ApiClient,
  type ApiServer,
} from "solid-component-model/rpc";

interface TestPageApi {
  getValue: () => string;
  getUser: (id: string) => Promise<{ id: string; name: string }>;
  calculate: (a: number, b: number) => number;
  failingMethod: () => never;
  asyncFailingMethod: () => Promise<void>;
  echo: (payload: { flag: boolean; count: number }) => {
    flag: boolean;
    count: number;
  };
}

describe("Chrome DevTools RPC Layer", () => {
  let mockWindowListeners: Array<(event: MessageEvent) => void> = [];
  let mockChromeRuntimeListeners: Array<
    (
      message: unknown,
      sender: any,
      sendResponse: (r: unknown) => void
    ) => boolean | void
  > = [];
  let fakeWindow: Window;

  beforeEach(() => {
    mockWindowListeners = [];
    mockChromeRuntimeListeners = [];

    // Fake Window with postMessage and addEventListener
    fakeWindow = {
      addEventListener: vi.fn((type: string, listener: any) => {
        if (type === "message") {
          mockWindowListeners.push(listener);
        }
      }),
      removeEventListener: vi.fn((type: string, listener: any) => {
        if (type === "message") {
          mockWindowListeners = mockWindowListeners.filter(l => l !== listener);
        }
      }),
      postMessage: vi.fn((data: any) => {
        queueMicrotask(() => {
          const event = {
            source: fakeWindow,
            data,
          } as MessageEvent;
          for (const listener of [...mockWindowListeners]) {
            listener(event);
          }
        });
      }),
    } as unknown as Window;

    // Mock Chrome globals
    (globalThis as any).chrome = {
      devtools: {
        inspectedWindow: {
          tabId: 12345,
        },
      },
      tabs: {
        sendMessage: vi.fn(
          (tabId: number, message: any, callback?: (r: any) => void) => {
            queueMicrotask(() => {
              let handled = false;
              for (const listener of [...mockChromeRuntimeListeners]) {
                const res = listener(message, { tab: { id: tabId } }, resp => {
                  handled = true;
                  callback?.(resp);
                });
                if (res === true) {
                  handled = true;
                }
              }
              if (!handled) {
                callback?.(undefined);
              }
            });
          }
        ),
      },
      runtime: {
        lastError: null,
        onMessage: {
          addListener: vi.fn((listener: any) => {
            mockChromeRuntimeListeners.push(listener);
          }),
          removeListener: vi.fn((listener: any) => {
            mockChromeRuntimeListeners = mockChromeRuntimeListeners.filter(
              l => l !== listener
            );
          }),
        },
        sendMessage: vi.fn((message: any, callback?: (r: any) => void) => {
          queueMicrotask(() => {
            let handled = false;
            for (const listener of [...mockChromeRuntimeListeners]) {
              const res = listener(message, {}, resp => {
                handled = true;
                callback?.(resp);
              });
              if (res === true) {
                handled = true;
              }
            }
            if (!handled) {
              callback?.(undefined);
            }
          });
        }),
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).chrome;
  });

  describe("End-to-End Pipeline (PanelClient -> ContentRelay -> MainWorldServer)", () => {
    let mainServer: ApiServer<TestPageApi>;
    let contentRelay: ChromeContentRelay;
    let panelClient: ApiClient<TestPageApi>;

    beforeEach(() => {
      // 1. Setup MAIN world server
      mainServer = createMainWorldServer<TestPageApi>(
        {
          getValue: () => "main-world-value",
          getUser: async (id: string) => ({ id, name: `User ${id}` }),
          calculate: (a: number, b: number) => a + b,
          failingMethod: () => {
            throw new Error("Synchronous error in MAIN");
          },
          asyncFailingMethod: async () => {
            throw new Error("Asynchronous error in MAIN");
          },
          echo: payload => payload,
        },
        { targetWindow: fakeWindow }
      );

      // 2. Setup ISOLATED content script relay
      contentRelay = createChromeContentRelay({ targetWindow: fakeWindow });

      // 3. Setup DevTools Panel client
      panelClient = createChromePanelClient<TestPageApi>();
    });

    afterEach(() => {
      mainServer.destroy();
      contentRelay.destroy();
      panelClient.destroy();
    });

    it("should request and return a synchronous string value from MAIN world", async () => {
      const result = await panelClient.request("getValue");
      expect(result).toBe("main-world-value");
    });

    it("should request and return an asynchronous object with arguments from MAIN world", async () => {
      const user = await panelClient.request("getUser", "99");
      expect(user).toEqual({ id: "99", name: "User 99" });
    });

    it("should request and return numeric calculation with multiple arguments", async () => {
      const sum = await panelClient.request("calculate", 15, 27);
      expect(sum).toBe(42);
    });

    it("should correctly round-trip complex object arguments and return values", async () => {
      const echoed = await panelClient.request("echo", {
        flag: true,
        count: 5,
      });
      expect(echoed).toEqual({ flag: true, count: 5 });
    });

    it("should reject with RpcExecutionError when MAIN world handler throws synchronously", async () => {
      await expect(panelClient.request("failingMethod")).rejects.toThrow(
        RpcExecutionError
      );
      await expect(panelClient.request("failingMethod")).rejects.toThrow(
        "Synchronous error in MAIN"
      );
    });

    it("should reject with RpcExecutionError when MAIN world handler rejects asynchronously", async () => {
      await expect(panelClient.request("asyncFailingMethod")).rejects.toThrow(
        RpcExecutionError
      );
      await expect(panelClient.request("asyncFailingMethod")).rejects.toThrow(
        "Asynchronous error in MAIN"
      );
    });

    it("should reject with RpcNoHandlerError when method has no handler registered", async () => {
      mainServer.unregister("getValue");
      await expect(panelClient.request("getValue")).rejects.toThrow(
        RpcNoHandlerError
      );
    });
  });

  describe("DevTools Relay", () => {
    it("should forward runtime messages from panel to tabs when relay is active", async () => {
      const mainServer = createMainWorldServer<TestPageApi>(
        {
          getValue: () => "relay-success",
        },
        { targetWindow: fakeWindow }
      );
      const contentRelay = createChromeContentRelay({
        targetWindow: fakeWindow,
      });
      const relay = createChromeDevToolsRelay({ tabId: 12345 });

      // Panel sending via runtime sendMessage (no direct tabId passed to client)
      const panelClient = createChromePanelClient<TestPageApi>({
        tabId: undefined,
      });

      const res = await panelClient.request("getValue");
      expect(res).toBe("relay-success");

      mainServer.destroy();
      contentRelay.destroy();
      relay.destroy();
      panelClient.destroy();
    });
  });

  describe("Timeout Handling", () => {
    it("should reject with RpcTimeoutError when MAIN world does not reply before timeout", async () => {
      const panelClient = createChromePanelClient<TestPageApi>({
        timeout: 50,
      });

      await expect(panelClient.request("getValue")).rejects.toThrow(
        RpcTimeoutError
      );

      panelClient.destroy();
    });
  });
});

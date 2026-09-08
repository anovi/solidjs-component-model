import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createApiClient,
  createApiServer,
  createLocalTransportPair,
  createDirectClientTransport,
  createWindowPostMessageTransport,
  RpcConnectionError,
  RpcExecutionError,
  RpcNoHandlerError,
  RpcTimeoutError,
  type ApiClient,
  type ApiServer,
} from "./index";

interface TestApi {
  getValue: () => string;
  getUser: (id: string) => Promise<{ id: string; name: string }>;
  calculate: (a: number, b: number) => number;
  failingSync: () => never;
  failingAsync: () => Promise<void>;
  echo: (payload: { key: string; value: number }) => {
    key: string;
    value: number;
  };
}

describe("RPC Layer", () => {
  describe("LocalTransportPair (In-Memory Microtask Transport)", () => {
    let client: ApiClient<TestApi>;
    let server: ApiServer<TestApi>;

    beforeEach(() => {
      const { clientTransport, serverTransport } = createLocalTransportPair();
      server = createApiServer<TestApi>({
        transport: serverTransport,
        handlers: {
          getValue: () => "server-value",
          getUser: async id => ({ id, name: `User ${id}` }),
          calculate: (a, b) => a + b,
          failingSync: () => {
            throw new Error("Sync failure in server");
          },
          failingAsync: async () => {
            throw new Error("Async failure in server");
          },
          echo: payload => payload,
        },
      });

      client = createApiClient<TestApi>({
        transport: clientTransport,
      });
    });

    afterEach(() => {
      client.destroy();
      server.destroy();
    });

    it("should execute synchronous handler and return result", async () => {
      const val = await client.request("getValue");
      expect(val).toBe("server-value");
    });

    it("should execute async handler with arguments and return object", async () => {
      const user = await client.request("getUser", "42");
      expect(user).toEqual({ id: "42", name: "User 42" });
    });

    it("should calculate multiple arguments correctly", async () => {
      const sum = await client.request("calculate", 20, 22);
      expect(sum).toBe(42);
    });

    it("should round-trip complex object structures", async () => {
      const payload = { key: "hello", value: 123 };
      const echoed = await client.request("echo", payload);
      expect(echoed).toEqual(payload);
    });

    it("should reject with RpcExecutionError when handler throws synchronously", async () => {
      await expect(client.request("failingSync")).rejects.toThrow(
        RpcExecutionError
      );
      await expect(client.request("failingSync")).rejects.toThrow(
        "Sync failure in server"
      );
    });

    it("should reject with RpcExecutionError when handler rejects asynchronously", async () => {
      await expect(client.request("failingAsync")).rejects.toThrow(
        RpcExecutionError
      );
      await expect(client.request("failingAsync")).rejects.toThrow(
        "Async failure in server"
      );
    });

    it("should reject with RpcNoHandlerError when method has no handler", async () => {
      server.unregister("getValue");
      await expect(client.request("getValue")).rejects.toThrow(
        RpcNoHandlerError
      );
    });
  });

  describe("DirectClientTransport", () => {
    it("should directly call server without extra transport overhead", async () => {
      const server = createApiServer<TestApi>({
        handlers: {
          getValue: () => "direct-value",
          calculate: (a, b) => a * b,
        },
      });
      const client = createApiClient<TestApi>({
        transport: createDirectClientTransport(server),
      });

      expect(await client.request("getValue")).toBe("direct-value");
      expect(await client.request("calculate", 6, 7)).toBe(42);

      client.destroy();
      server.destroy();
    });
  });

  describe("Dynamic Handler Registration", () => {
    it("should support register, registerAll, unregister, and has", async () => {
      const { clientTransport, serverTransport } = createLocalTransportPair();
      const server = createApiServer<TestApi>({ transport: serverTransport });
      const client = createApiClient<TestApi>({ transport: clientTransport });

      expect(server.has("getValue")).toBe(false);

      server.register("getValue", () => "dynamic-value");
      expect(server.has("getValue")).toBe(true);
      expect(await client.request("getValue")).toBe("dynamic-value");

      server.registerAll({
        calculate: (a, b) => a * b,
      });
      expect(await client.request("calculate", 3, 4)).toBe(12);

      server.unregister("getValue");
      expect(server.has("getValue")).toBe(false);
      await expect(client.request("getValue")).rejects.toThrow(
        RpcNoHandlerError
      );

      client.destroy();
      server.destroy();
    });

    it("should accept initial handlers as first argument or in options object", () => {
      const serverA = createApiServer<TestApi>({
        getValue: () => "a",
      });
      expect(serverA.has("getValue")).toBe(true);

      const serverB = createApiServer<TestApi>({
        handlers: { getValue: () => "b" },
      });
      expect(serverB.has("getValue")).toBe(true);
    });
  });

  describe("Timeout Handling", () => {
    it("should reject with RpcTimeoutError when response is not received in time", async () => {
      const { clientTransport } = createLocalTransportPair();
      // Server transport not wired to any responder
      const client = createApiClient<TestApi>({
        transport: clientTransport,
        timeout: 50,
      });

      await expect(client.request("getValue")).rejects.toThrow(RpcTimeoutError);

      client.destroy();
    });
  });

  describe("Custom Source / Namespace Isolation", () => {
    it("should separate communication for different sources", async () => {
      let mockListeners: Array<(event: MessageEvent) => void> = [];
      const fakeWin = {
        addEventListener: vi.fn((type: string, listener: any) => {
          if (type === "message") mockListeners.push(listener);
        }),
        removeEventListener: vi.fn((type: string, listener: any) => {
          if (type === "message") {
            mockListeners = mockListeners.filter(l => l !== listener);
          }
        }),
        postMessage: vi.fn((data: any) => {
          queueMicrotask(() => {
            const ev = { source: fakeWin, data } as MessageEvent;
            for (const l of [...mockListeners]) l(ev);
          });
        }),
      } as unknown as Window;

      const transportA = createWindowPostMessageTransport({
        source: "app-a",
        targetWindow: fakeWin,
      });
      const serverA = createApiServer<{ ping: () => string }>({
        source: "app-a",
        transport: transportA,
        handlers: { ping: () => "pong-A" },
      });
      const clientA = createApiClient<{ ping: () => string }>({
        source: "app-a",
        transport: transportA,
      });

      const transportB = createWindowPostMessageTransport({
        source: "app-b",
        targetWindow: fakeWin,
      });
      const serverB = createApiServer<{ ping: () => string }>({
        source: "app-b",
        transport: transportB,
        handlers: { ping: () => "pong-B" },
      });
      const clientB = createApiClient<{ ping: () => string }>({
        source: "app-b",
        transport: transportB,
      });

      expect(await clientA.request("ping")).toBe("pong-A");
      expect(await clientB.request("ping")).toBe("pong-B");

      clientA.destroy();
      serverA.destroy();
      clientB.destroy();
      serverB.destroy();
      transportA.destroy?.();
      transportB.destroy?.();
    });
  });

  describe("Teardown & Cleanup", () => {
    it("should reject pending requests on client.destroy()", async () => {
      const { clientTransport } = createLocalTransportPair();
      const client = createApiClient<TestApi>({
        transport: clientTransport,
        timeout: 10000,
      });

      const reqPromise = client.request("getValue");
      client.destroy();

      await expect(reqPromise).rejects.toThrow(RpcConnectionError);
      await expect(reqPromise).rejects.toThrow("ApiClient was destroyed");
    });

    it("should return error response from destroyed server", async () => {
      const server = createApiServer<TestApi>({
        handlers: { getValue: () => "val" },
      });
      server.destroy();

      const res = await server.handleRequest({
        kind: "request",
        id: "1",
        method: "getValue",
        args: [],
      });
      expect(res.error).toBe("ApiServer was destroyed");
    });
  });
});

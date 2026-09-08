import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createLocalPanelClient,
  createLocalDevToolsServer,
  createLocalDevToolsConnection,
  attachLocalDevTools,
} from "./index";
import {
  RpcExecutionError,
  RpcNoHandlerError,
  RpcTimeoutError,
  type ApiClient,
  type ApiServer,
} from "@solid-component-model/rpc";

interface TestAppApi {
  getValue: () => string;
  getUser: (id: string) => Promise<{ id: string; name: string }>;
  calculate: (a: number, b: number) => number;
  failingMethod: () => never;
}

describe("Local DevTools RPC Layer", () => {
  describe("createLocalDevToolsConnection", () => {
    let connection: {
      client: ApiClient<TestAppApi>;
      server: ApiServer<TestAppApi>;
      destroy: () => void;
    };

    beforeEach(() => {
      connection = createLocalDevToolsConnection<TestAppApi>({
        getValue: () => "local-value",
        getUser: async id => ({ id, name: `User ${id}` }),
        calculate: (a, b) => a + b,
        failingMethod: () => {
          throw new Error("Local failure");
        },
      });
    });

    afterEach(() => {
      connection.destroy();
    });

    it("should request and return values over local transport pair", async () => {
      const value = await connection.client.request("getValue");
      expect(value).toBe("local-value");

      const user = await connection.client.request("getUser", "42");
      expect(user).toEqual({ id: "42", name: "User 42" });

      const sum = await connection.client.request("calculate", 10, 25);
      expect(sum).toBe(35);
    });

    it("should handle error propagation", async () => {
      await expect(connection.client.request("failingMethod")).rejects.toThrow(
        RpcExecutionError
      );
    });

    it("should throw RpcNoHandlerError for unregistered methods", async () => {
      connection.server.unregister("getValue");
      await expect(connection.client.request("getValue")).rejects.toThrow(
        RpcNoHandlerError
      );
    });
  });

  describe("createLocalPanelClient with direct server", () => {
    it("should execute requests directly against server instance", async () => {
      const server = createLocalDevToolsServer<TestAppApi>({
        getValue: () => "direct-value",
      });

      const client = createLocalPanelClient<TestAppApi>({ server });
      const result = await client.request("getValue");
      expect(result).toBe("direct-value");

      client.destroy();
      server.destroy();
    });
  });

  describe("attachLocalDevTools", () => {
    it("should register factory on globalThis and route requests to instantiated server", async () => {
      const attached = attachLocalDevTools<TestAppApi>();
      const globalObj = globalThis as unknown as {
        __COMPONENT_MODEL_DEVTOOLS_FACTORY__?: unknown;
      };

      expect(typeof globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__).toBe(
        "function"
      );

      // Simulate ComponentModel initializing its devtools server
      (
        globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__ as (
          handlers: Partial<TestAppApi>
        ) => void
      )({
        getValue: () => "attached-value",
      });

      const value = await attached.client.request("getValue");
      expect(value).toBe("attached-value");

      attached.destroy();
      expect(globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__).toBeUndefined();
    });

    it("should integrate with solid-component-model lifecycle and fetch live models", async () => {
      const { ParentAppModel } = await import("../../demo/models");
      const attached = attachLocalDevTools();

      const model = new ParentAppModel();
      model.start();

      const models = await attached.client.request("getModels");
      expect(Array.isArray(models)).toBe(true);
      expect(models).toContain(model._id);

      attached.destroy();
      model.stop();
    });
  });

  describe("Timeout Handling", () => {
    it("should reject when request times out", async () => {
      const client = createLocalPanelClient<TestAppApi>({
        timeout: 10,
        transport: {
          send: () => {
            // never responds
          },
        },
      });

      await expect(client.request("getValue")).rejects.toThrow(RpcTimeoutError);
      client.destroy();
    });
  });
});

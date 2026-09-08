import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createApiClient,
  createApiServer,
  createLocalTransportPair,
  type ApiClient,
  type ApiServer,
} from "@solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";
import { createPanelApp, createDevtoolsState } from "./index";

describe("DevTools Panel SolidJS Layer", () => {
  let client: ApiClient<ComponentModelDevToolsApi>;
  let server: ApiServer<ComponentModelDevToolsApi>;

  beforeEach(() => {
    const { clientTransport, serverTransport } = createLocalTransportPair();

    server = createApiServer<ComponentModelDevToolsApi>({
      transport: serverTransport,
      handlers: {
        getModels: () => ["ModelA", "ModelB", "ModelC"],
      },
    });

    client = createApiClient<ComponentModelDevToolsApi>({
      transport: clientTransport,
    });
  });

  afterEach(() => {
    client.destroy();
    server.destroy();
  });

  it("should fetch models using createDevtoolsState signals", async () => {
    const state = createDevtoolsState(client);
    expect(state.models()).toEqual([]);

    const models = await state.refresh();
    expect(models).toEqual(["ModelA", "ModelB", "ModelC"]);
    expect(state.models()).toEqual(["ModelA", "ModelB", "ModelC"]);
    expect(state.error()).toBeNull();
    expect(state.logs().length).toBeGreaterThan(0);
  });

  it("should handle errors in state when server throws", async () => {
    server.register("getModels", () => {
      throw new Error("Failed to inspect models");
    });

    const state = createDevtoolsState(client);
    await expect(state.refresh()).rejects.toThrow("Failed to inspect models");
    expect(state.error()).toContain("Failed to inspect models");
    expect(state.logs().some(l => l.type === "error")).toBe(true);
  });

  it("should clear logs with clearLog", () => {
    const state = createDevtoolsState(client);
    state.appendLog("Test log", "info");
    expect(state.logs().length).toBe(1);

    state.clearLog();
    expect(state.logs().length).toBe(0);
  });

  it("should mount DevtoolsPanel SolidJS component using createPanelApp", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const app = createPanelApp({ client, container, autoFetch: false });
    expect(app.client).toBe(client);
    expect(container.querySelector(".devtools-panel-root")).toBeTruthy();
    expect(container.querySelector(".devtools-panel-toolbar")).toBeTruthy();

    app.dispose();
    container.remove();
  });
});

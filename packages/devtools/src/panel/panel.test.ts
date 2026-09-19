// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot } from "solid-js";
import {
  createApiClient,
  createApiServer,
  type ApiClient,
  type ApiServer,
  type ClientTransport,
  type ServerMessages,
} from "@solid-component-model/rpc";
import { createPanelApp, createDevtoolsState, createLogsStore } from "./index";
import { createModelsStore, type ModelSnapshot } from "./stores/models";
import { createChartsStore } from "./stores/charts";
import type { LogsStore } from "./stores/logs";

// Exercise the real RPC client/server through the current event protocol.
function createTestConnection() {
  const messages = new Set<(message: ServerMessages) => void>();
  const connected = new Set<() => void>();
  const disconnected = new Set<() => void>();
  const transport: ClientTransport = {
    connect: vi.fn(() => Promise.resolve()),
    send: vi.fn(),
    onConnected: cb => {
      connected.add(cb);
    },
    onDisonnected: cb => {
      disconnected.add(cb);
    },
    onMessage: (type, listener) => {
      const receive = (message: ServerMessages) => {
        if (message.type === type) {
          listener(message as Extract<ServerMessages, { type: typeof type }>);
        }
      };
      messages.add(receive);
      return {
        unsubscribe: () => {
          messages.delete(receive);
        },
      };
    },
  };
  const server = createApiServer({
    send: message => messages.forEach(receive => receive(message)),
    onConnected: () => {},
    onDisonnected: () => {},
    onMessage: () => ({ unsubscribe: () => {} }),
  });
  return {
    transport,
    client: createApiClient(transport),
    server,
    connect: () => connected.forEach(cb => cb()),
    disconnect: () => disconnected.forEach(cb => cb()),
  };
}

const model: ModelSnapshot = {
  _id: "model-a",
  name: "ModelA",
  state: "idle",
  data: {},
  status: "active",
};

const chart = { _id: "chart-a", states: [] };

describe("DevTools Panel SolidJS Layer", () => {
  let connection: ReturnType<typeof createTestConnection>;
  let client: ApiClient;
  let server: ApiServer;
  let logger: LogsStore;
  let dispose: (() => void) | undefined;
  let container: HTMLElement | undefined;

  function createState() {
    return createRoot(rootDispose => {
      dispose = rootDispose;
      return createDevtoolsState(client, logger);
    });
  }

  beforeEach(() => {
    connection = createTestConnection();
    ({ client, server } = connection);
    logger = createLogsStore();
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    container?.remove();
    container = undefined;
    createModelsStore().reset();
    createChartsStore().reset();
  });

  it("connects and records the connection in the logger", async () => {
    const state = createState();
    expect(state.state()).toBe("loading");
    expect(state.models).toEqual([]);
    expect(connection.transport.connect).toHaveBeenCalledOnce();

    await vi.waitFor(() => expect(state.state()).toBe("ok"));
    expect(state.error()).toBeNull();
    expect(state.logger).toBe(logger);
    expect(logger.logs).toEqual([
      expect.objectContaining({ type: "info", message: "Connected" }),
    ]);
  });

  it("adds, updates, and removes models from server events", () => {
    const state = createState();
    server.registerModel(model);
    expect(state.models).toEqual([model]);

    const updated = { ...model, state: "running", data: { count: 1 } };
    server.sendModelSnapshot(updated);
    expect(state.models).toEqual([updated]);

    server.unregisterModel(model._id);
    expect(state.models).toEqual([]);
  });

  it("clears models, charts, and logs on disconnect and accepts fresh events on reconnect", async () => {
    const state = createState();
    await vi.waitFor(() => expect(state.state()).toBe("ok"));
    server.registerModel(model);
    server.registerChart(chart);
    expect(state.charts).toEqual([chart]);
    expect(logger.logs).toHaveLength(1);

    connection.disconnect();
    expect(state.state()).toBe("loading");
    expect(state.error()).toBeNull();
    expect(state.models).toEqual([]);
    expect(state.charts).toEqual([]);
    expect(logger.logs).toEqual([]);

    connection.connect();
    expect(state.state()).toBe("ok");
    const freshModel = { ...model, _id: "model-b" };
    server.registerModel(freshModel);
    server.registerChart(chart);
    expect(state.models).toEqual([freshModel]);
    expect(state.charts).toEqual([chart]);
  });

  it("reports connection failures and clears the error on disconnect", async () => {
    vi.mocked(connection.transport.connect).mockRejectedValueOnce(
      new Error("Connection failed")
    );
    const state = createState();

    await vi.waitFor(() => expect(state.state()).toBe("error"));
    expect(state.error()).toContain("Connection failed");
    expect(logger.logs).toEqual([
      expect.objectContaining({
        type: "error",
        message: expect.stringContaining("Connection failed"),
      }),
    ]);

    connection.disconnect();
    expect(state.state()).toBe("loading");
    expect(state.error()).toBeNull();
    expect(logger.logs).toEqual([]);
  });

  it("mounts the panel, shows connection errors, and clears logs through the UI", async () => {
    vi.mocked(connection.transport.connect).mockRejectedValueOnce(
      new Error("Cannot inspect page")
    );
    container = document.createElement("div");
    document.body.appendChild(container);

    const app = createPanelApp({ client, logger, container });
    dispose = app.dispose;
    expect(app.client).toBe(client);
    expect(container.querySelector(".devtools-panel-root")).toBeTruthy();
    expect(container.querySelector(".devtools-panel-toolbar")).toBeTruthy();
    expect(container.textContent).toContain("Loading");

    await vi.waitFor(() =>
      expect(container?.textContent).toContain("Cannot inspect page")
    );
    const logsTab = [...container.querySelectorAll("button")].find(
      button => button.textContent === "Logs"
    )!;
    logsTab.click();
    expect(container.querySelector(".log-error")?.textContent).toContain(
      "Cannot inspect page"
    );
    container.querySelector<HTMLButtonElement>(".devtools-btn")!.click();
    expect(logger.logs).toEqual([]);
    expect(container.querySelector(".log-line")).toBeNull();

    app.dispose();
    dispose = undefined;
    expect(container.childElementCount).toBe(0);
  });
});

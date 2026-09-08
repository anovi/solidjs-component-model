import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createApiClient,
  createApiServer,
  createLocalTransportPair,
  type ApiClient,
  type ApiServer,
} from "@solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";
import { DevtoolsPanel, createPanelApp, createDevtoolsState } from "./index";

function createMockContainer() {
  const triggerListeners: Array<() => void> = [];
  const clearListeners: Array<() => void> = [];
  let logHtml = "";
  const children: any[] = [];

  const triggerBtn = {
    addEventListener: vi.fn((type: string, fn: () => void) => {
      if (type === "click") triggerListeners.push(fn);
    }),
    click: () => {
      triggerListeners.forEach(fn => fn());
    },
  };

  const clearBtn = {
    addEventListener: vi.fn((type: string, fn: () => void) => {
      if (type === "click") clearListeners.push(fn);
    }),
    click: () => {
      clearListeners.forEach(fn => fn());
    },
  };

  const logElement = {
    get innerHTML() {
      return logHtml;
    },
    set innerHTML(val: string) {
      logHtml = val;
      children.length = 0;
    },
    scrollTop: 0,
    scrollHeight: 100,
    appendChild: (child: any) => {
      children.push(child);
      logHtml += child.textContent;
    },
    get textContent() {
      return logHtml;
    },
  };

  const container = {
    querySelector: (selector: string) => {
      if (selector === "#trigger") return triggerBtn;
      if (selector === "#clear") return clearBtn;
      if (selector === "#log") return logElement;
      return null;
    },
    triggerBtn,
    clearBtn,
    logElement,
  } as unknown as HTMLElement;

  return {
    container,
    triggerBtn,
    clearBtn,
    logElement,
  };
}

describe("DevTools Panel UI Layer (Independent of Chrome)", () => {
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

  it("should fetch models using createDevtoolsState hook/helper", async () => {
    const state = createDevtoolsState(client);
    expect(state.models).toEqual([]);

    const models = await state.refresh();
    expect(models).toEqual(["ModelA", "ModelB", "ModelC"]);
    expect(state.models).toEqual(["ModelA", "ModelB", "ModelC"]);
    expect(state.error).toBeNull();
  });

  it("should handle errors in state when server throws", async () => {
    server.register("getModels", () => {
      throw new Error("Failed to inspect models");
    });

    const state = createDevtoolsState(client);
    await expect(state.refresh()).rejects.toThrow("Failed to inspect models");
    expect(state.error).toContain("Failed to inspect models");
  });

  it("should mount DevtoolsPanel into DOM container and handle user interactions", async () => {
    const { container, logElement } = createMockContainer();

    const panel = new DevtoolsPanel({ client, container });
    const models = await panel.fetchModels();
    expect(models).toEqual(["ModelA", "ModelB", "ModelC"]);

    expect(logElement.textContent).toContain(
      'Received models: ["ModelA","ModelB","ModelC"]'
    );

    panel.clearLog();
    expect(logElement.innerHTML).toBe("");
  });

  it("should create panel app using createPanelApp helper", async () => {
    const { container } = createMockContainer();

    const app = createPanelApp({ client, container });
    expect(app.client).toBe(client);
  });
});

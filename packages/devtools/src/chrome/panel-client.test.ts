import { afterEach, expect, it, vi } from "vitest";
import { createApiClient } from "@solid-component-model/rpc";
import { createChromePanelTransport } from "./panel-client";
import { createDevtoolsState } from "../panel/hooks/useDevtoolsState";
import { createModelsStore } from "../panel/stores/models";
import { createChartsStore } from "../panel/stores/charts";
function event() {
  const listeners = new Set<(...args: any[]) => void>();
  return {
    addListener: (cb: (...args: any[]) => void) => listeners.add(cb),
    removeListener: (cb: (...args: any[]) => void) => listeners.delete(cb),
    emit: (...args: any[]) => listeners.forEach(cb => cb(...args)),
    listeners,
  };
}
afterEach(() => {
  createModelsStore().reset();
  createChartsStore().reset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("clears stores before reconnect, ignores the old port, and stops on destroy", async () => {
  vi.useFakeTimers();
  const navigation = event();
  const ports: any[] = [];
  const connect = vi.fn(() => {
    const port = {
      onMessage: event(),
      onDisconnect: event(),
      disconnect: () => port.onDisconnect.emit(),
      postMessage: vi.fn(),
    };
    ports.push(port);
    return port;
  });
  vi.stubGlobal("chrome", {
    devtools: {
      inspectedWindow: { tabId: 1 },
      network: { onNavigated: navigation },
    },
    tabs: { connect },
  });
  const logger = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    clear: vi.fn(),
    logs: [],
  };
  const transport = await createChromePanelTransport(logger);
  const state = createDevtoolsState(createApiClient(transport), logger);
  await Promise.resolve();
  await Promise.resolve();
  const model = {
    _id: "old",
    name: "Old",
    state: "idle",
    data: {},
    status: "active",
  };
  ports[0].onMessage.emit({ type: "MODEL_ADDED", snapshot: model });
  ports[0].onMessage.emit({
    type: "REGISTER_CHART",
    chart: { _id: "chart", states: [] },
  });
  expect(state.models).toHaveLength(1);
  expect(state.charts).toHaveLength(1);
  ports[0].onDisconnect.emit();
  expect(state.models).toHaveLength(0);
  expect(state.charts).toHaveLength(0);
  expect(state.state()).toBe("loading");
  await vi.advanceTimersByTimeAsync(1000);
  expect(state.state()).toBe("ok");
  ports[0].onMessage.emit({ type: "MODEL_ADDED", snapshot: model });
  ports[1].onMessage.emit({
    type: "MODEL_ADDED",
    snapshot: { ...model, _id: "new" },
  });
  expect(state.models.map(model => model._id)).toEqual(["new"]);
  transport.destroy!();
  expect(navigation.listeners.size).toBe(0);
  await vi.advanceTimersByTimeAsync(5000);
  expect(connect).toHaveBeenCalledTimes(2);
});

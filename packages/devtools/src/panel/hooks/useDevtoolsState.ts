import { createSignal, type Accessor } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import { createModelsStore, ModelsStore } from "../stores/models";
import { LogsStore } from "../stores/logs";
import { ChartsStore, createChartsStore } from "../stores/charts";

export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 600;
const LAYOUT_STORAGE_KEY = "solid-component-model.devtools.layout";

export interface DevtoolsLayout {
  sidebarWidth: number;
}

function clampSidebarWidth(width: number) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

function readLayout(): DevtoolsLayout {
  try {
    const saved = JSON.parse(
      localStorage.getItem(LAYOUT_STORAGE_KEY) ?? "null"
    );
    if (
      typeof saved?.sidebarWidth === "number" &&
      Number.isFinite(saved.sidebarWidth)
    ) {
      return { sidebarWidth: clampSidebarWidth(saved.sidebarWidth) };
    }
  } catch {
    // Storage may be unavailable or contain an invalid value.
  }
  return { sidebarWidth: 200 };
}

type AppState = "loading" | "ok" | "error";

export interface DevtoolsState {
  layout: Accessor<DevtoolsLayout>;
  setSidebarWidth: (width: number) => void;
  models: ModelsStore["models"];
  charts: ChartsStore["charts"];
  logger: LogsStore;
  state: Accessor<AppState>;
  error: Accessor<string | null>;
}

export function createDevtoolsState(
  client: ApiClient,
  logger: LogsStore
): DevtoolsState {
  const [state, setState] = createSignal<AppState>("loading");
  const [error, setError] = createSignal<string | null>(null);
  const [layout, setLayout] = createSignal<DevtoolsLayout>(readLayout());
  function setSidebarWidth(width: number) {
    if (!Number.isFinite(width)) return;
    const next = { sidebarWidth: clampSidebarWidth(width) };
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Resizing still works when persistence is unavailable.
    }
  }
  const models = createModelsStore();
  const charts = createChartsStore();
  const clientRef = client;

  function reset() {
    setState("loading");
    setError(null);
    models.reset();
    charts.reset();
    logger.clear();
  }

  reset();
  clientRef.onDisconnected(reset);
  clientRef.onConnected(() => {
    setState("ok");
  });

  clientRef.onModelAdded(snapshot => models.addModel(snapshot));
  clientRef.onModelUpdated(snapshot => models.updateModel(snapshot));
  clientRef.onModelRemoved(id => models.removeModel(id));

  clientRef.onChartRegistered(chart => charts.registerChart(chart));

  clientRef
    .connect()
    .then(() => {
      logger.log("Connected");
      setState("ok");
    })
    .catch(err => {
      setError(String(err));
      setState("error");
      logger.error("Connection failed: " + err);
    });

  return {
    layout,
    setSidebarWidth,
    logger,
    error,
    state,
    get models() {
      return models.models;
    },
    get charts() {
      return charts.charts;
    },
  };
}

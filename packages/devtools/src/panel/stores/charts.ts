import { createStore } from "solid-js/store";
import { StateChartDescriptor } from "solid-component-model";

export type ChartsStore = {
  charts: StateChartDescriptor[];
  registerChart: (chart: StateChartDescriptor) => void;
};

const [store, setStore] = createStore<{ charts: StateChartDescriptor[] }>({
  charts: [],
});

export function createChartsStore(): ChartsStore {
  return {
    get charts() {
      return store.charts;
    },

    registerChart: (chart: StateChartDescriptor) => {
      setStore("charts", store.charts.length, chart);
    },
  };
}

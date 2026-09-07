import { ComponentModel } from "../../src";
import { WithStateChart } from "../../src/create-chart";
import type { StateChartConfig } from "../../src/state-chart";

type MyModelData = {
  some: string;
  state: string;
};

type Events =
  | { type: "SOME"; value: string }
  | { type: "OTHER"; value: string }
  | { type: "TO_OBSERVABLE" }
  | { type: "DATA_LOADED"; data: string }
  | { type: "BREAK_LOADING" };

const config: StateChartConfig<Model, Events> = {
  initial: "initial",
  states: {
    initial: {
      on: {
        SOME: {
          action() {
            this.someEffect();
          },
        },
      },
    },
    loading: {},
    some: {},
  },
};

class Model extends ComponentModel<MyModelData, Events> {
  static config = config;

  constructor() {
    super({
      some: "info",
      state: "initial",
    });
  }

  protected someEffect() {
    this.effectFired = true;
  }

  effectFired = false;
}

export const ModelWithConfig = WithStateChart(Model, config);

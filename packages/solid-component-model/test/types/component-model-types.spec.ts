import { it, describe } from "vitest";
import {
  ComponentModel,
  WithStateChart,
  StateChart,
  type StateChartPaths,
  type AnyModel,
} from "../../src";
import { ParentModel } from "../test-models/parent-model";
import type { StateChartConfigPaths } from "../../src/state-chart/state-path";

/* ------------------------------------------------------------------- */

class Model extends ComponentModel {
  constructor() {
    super({});
  }
}

const config = {
  initial: "idle",
  states: {
    idle: {},
    running: {},
  },
} as const;

const compiled = StateChart.create(config);

/* ------------------------------------------------------------------- */

type CounterEvents = { type: "STEP"; amount: number } | { type: "RESET" };

class CounterModel extends ComponentModel<{ some: string }, CounterEvents> {
  count = 0;
  constructor() {
    super({ some: "" });
  }
  increment(amount: number) {
    this.count += amount;
  }
}

/* ------------------------------------------------------------------- */

describe("WithStateChart", function () {
  it("type-safe: StatePaths helper produces valid paths from config", async function () {
    type Paths = StateChartConfigPaths<typeof config>;
    expectTypeOf<Paths>().toEqualTypeOf<"idle" | "running">();
  });

  it("type-safe: StateChartPaths/ChartPaths helper produces valid paths from compiled chart", async function () {
    type Paths = StateChartPaths<typeof compiled>;
    expectTypeOf<Paths>().toEqualTypeOf<"idle" | "running">();
  });

  it("type-safe: matches() accepts string by default or generic paths parameter", async function () {
    type Paths = StateChartPaths<typeof compiled>;
    const ModelFromCompiled = WithStateChart(Model, compiled);
    const instance = new ModelFromCompiled();

    expectTypeOf(instance.matches).parameter(0).toEqualTypeOf<string>();
    instance.matches("running");
    instance.matches<Paths>("idle");

    // @ts-expect-error No such state when typed with Paths
    instance.matches<Paths>("foobar");
  });

  it("type-safe: matches() accepts string for a model from config", async function () {
    type Paths = StateChartConfigPaths<typeof config>;
    const ModelFromConfig = WithStateChart(Model, config);
    const instance = new ModelFromConfig();

    expectTypeOf(instance.matches).parameter(0).toEqualTypeOf<string>();
    instance.matches("running");
    instance.matches<Paths>("idle");

    // @ts-expect-error No such state when typed with Paths
    instance.matches<Paths>("foobar");
  });

  it("preserves static methods fromJSON and fromPersistedSnapshot with explicit generic", async function () {
    const ModelFromConfig = WithStateChart<typeof CounterModel>(CounterModel, {
      initial: "idle",
      states: { idle: {} },
    });

    expectTypeOf(ModelFromConfig.fromJSON).toBeFunction();
    expectTypeOf(ModelFromConfig.fromPersistedSnapshot).toBeFunction();
  });

  it("returns correct instance type when restored fromJSON and fromPersistedSnapshot", async function () {
    const parent = new ParentModel();
    parent.start();
    const snapshot = parent.toJSON();
    parent.stop();

    type ParentModelInstance = InstanceType<typeof ParentModel>;

    const newParent = ParentModel.fromJSON(snapshot);
    expectTypeOf(newParent).toEqualTypeOf<ParentModelInstance>();

    const newParent2 = ParentModel.fromPersistedSnapshot(snapshot);
    expectTypeOf(newParent2).toEqualTypeOf<ParentModelInstance>();
  });

  it("ComponentModel is equal to AnyModel", async () => {
    const parent = new ParentModel();
    const some: AnyModel = parent;
    void some;
    expectTypeOf(parent).toMatchTypeOf<AnyModel>();
  });
});

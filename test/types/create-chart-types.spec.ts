import { it, describe } from "vitest";
import {
  ComponentModel,
  WithStateChart,
  StateChart,
  type StatePaths,
} from "../../src";
import { ParentModel } from "../test-models/parent-model";

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
  it("type-safe: matches() works with both raw and compiled chart", async function () {
    const ModelFromConfig = WithStateChart(Model, config);
    const inst1 = new ModelFromConfig();
    type Paths = StatePaths<typeof config>;
    expectTypeOf(inst1.matches).parameter(0).toEqualTypeOf<Paths>();
    inst1.matches("running");

    const compiled = StateChart.create(config);
    const ModelFromCompiled = WithStateChart(Model, compiled);
    const inst2 = new ModelFromCompiled();

    expectTypeOf(inst2.matches).parameter(0).toEqualTypeOf<Paths>();

    // @ts-expect-error No such state
    inst1.matches("foobar");
  });

  it("infers `this` and events when created with <Model, Events>", async function () {
    const chart = StateChart.create<CounterModel, CounterEvents>({
      initial: "active",
      states: {
        active: {
          on: {
            STEP: {
              guard(ev) {
                return ev.amount > 0 && this.count >= 0;
              },
              action(ev) {
                this.increment(ev.amount);
                expectTypeOf(this).toEqualTypeOf<CounterModel>();
              },
            },
            RESET: {
              action() {
                this.count = 0;
              },
            },
          },
        },
      },
    });

    void chart;
  });

  it("infers `this` when created with a plain object type", async function () {
    const plainContext = {
      value: 0,
      inc() {
        this.value++;
      },
    };

    const chart = StateChart.create<typeof plainContext>({
      initial: "idle",
      states: {
        idle: {
          on: {
            TICK: {
              action() {
                this.inc();
                expectTypeOf(this).toEqualTypeOf<typeof plainContext>();
              },
            },
          },
        },
      },
    });
    void chart;
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
});

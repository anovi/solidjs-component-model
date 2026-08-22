import { it, describe, expectTypeOf } from "vitest";
import {
  ComponentModel,
  StateChart,
  Interpreter,
  WithStateChart,
  type InterpreterPaths,
} from "../../src";

type CounterEvents = { type: "STEP"; amount: number } | { type: "RESET" };

interface CounterModel extends ComponentModel<{ some: string }, CounterEvents> {
  count: number;
  increment: (amount: number) => void;
}

class ConcreteCounterModel
  extends ComponentModel<{ some: string }, CounterEvents>
  implements CounterModel
{
  count: number = 0;
  increment() {}
  constructor() {
    super({ some: "" });
  }
}

describe("StateChart.create", function () {
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

  it("it creates interpreter with correct types", async function () {
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

    const ModelCtor = WithStateChart(ConcreteCounterModel, chart);
    const model = new ModelCtor();
    const interpreter = chart.createRuntime(model);

    interpreter.getMostSpecificHandler("", { type: "RESET" });
    expectTypeOf(interpreter.getMostSpecificHandler)
      .parameter(0)
      .toEqualTypeOf<string>();
    expectTypeOf(interpreter.getMostSpecificHandler)
      .parameter(1)
      .toEqualTypeOf<CounterEvents | undefined>();
  });

  it("infers state paths from Interpreter with nested states", async function () {
    const config = {
      initial: "active",
      states: {
        active: {
          initial: "step1",
          states: {
            step1: {},
            step2: {},
          },
        },
        idle: {},
      },
    } as const;
    const chart = StateChart.create(config);

    const ModelCtor = WithStateChart(ConcreteCounterModel, chart);
    const model = new ModelCtor();
    const interpreter = chart.createRuntime(model);

    type Paths = InterpreterPaths<typeof interpreter>;
    expectTypeOf<Paths>().toEqualTypeOf<
      "active" | "active.step1" | "active.step2" | "idle"
    >();
  });

  it("infers state paths from direct Interpreter instantiation", async function () {
    const config = {
      initial: "idle",
      states: {
        idle: {},
        running: {},
      },
    } as const;
    const chart = StateChart.create(config);

    const ModelCtor = WithStateChart(ConcreteCounterModel, chart);
    const model = new ModelCtor();
    const interpreter = new Interpreter(model, chart);

    type Paths = InterpreterPaths<typeof interpreter>;
    expectTypeOf<Paths>().toEqualTypeOf<"idle" | "running">();
  });

  it("infers state paths from Interpreter when StateChart is created with explicit generic types", async function () {
    const config = {
      initial: "active",
      states: {
        active: {
          initial: "step1",
          states: {
            step1: {},
            step2: {},
          },
        },
        idle: {},
      },
    } as const;
    const chart = StateChart.create<CounterModel, CounterEvents, typeof config>(
      config
    );

    const ModelCtor = WithStateChart(ConcreteCounterModel, chart);
    const model = new ModelCtor();
    const interpreter = chart.createRuntime(model);

    type Paths = InterpreterPaths<typeof interpreter>;
    expectTypeOf<Paths>().toEqualTypeOf<
      "active" | "active.step1" | "active.step2" | "idle"
    >();
  });
});

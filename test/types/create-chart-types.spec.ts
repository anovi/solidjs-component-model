import { it, describe } from "vitest";
import { ComponentModel, StateChart, WithStateChart } from "../../src";

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
    const runtime = chart.createRuntime(model);

    runtime.getMostSpecificHandler("", { type: "RESET" });
  });
});

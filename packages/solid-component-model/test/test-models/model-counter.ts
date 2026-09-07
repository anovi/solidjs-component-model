import { ComponentModel, WithStateChart } from "../../src";

class Counter extends ComponentModel<{ counter: number }, { type: "DO" }> {
  constructor() {
    super({ counter: 0 });
  }
}

export const CounterMachine = WithStateChart(Counter, {
  initial: "first",
  states: {
    first: {
      on: {
        DO: {
          target: "second",
        },
      },
    },
    second: {
      entry() {
        this.setData("counter", v => v + 1);
      },
      on: {
        DO: {
          target: "first",
        },
      },
    },
  },
});

import { ComponentModel } from "../../src";
import { WithStateChart } from "../../src/create-chart";

type Data = {
  some: string;
  delayedFired: boolean;
  secondScheduleFired: boolean;
  thirdEntryScheduleFired: boolean;
};

type Events = { type: "some" } | { type: "prevent" } | { type: "toThird" };

class Model extends ComponentModel<Data, Events> {
  constructor() {
    super({
      some: "info",
      delayedFired: false,
      secondScheduleFired: false,
      thirdEntryScheduleFired: false,
    });
  }

  eventThatSchedules(value: string) {
    this.schedule({
      after: 10,
      action: () => this.setData("some", value),
    });
  }
}

export const ModelWithDelayedTransitions = WithStateChart(Model, {
  initial: "Default",
  states: {
    Default: {
      on: {
        some: {
          target: "Second",
        },
      },
    },
    Second: {
      entry() {
        this.schedule({
          after: 50,
          target: "Default",
          action: () => this.setData("delayedFired", true),
        });
        this.schedule({
          after: 60,
          action: () => this.setData("secondScheduleFired", true),
        });
      },
      on: {
        prevent: {
          target: "Default",
        },
        toThird: {
          target: "Third",
        },
      },
    },
    Third: {
      entry() {
        this.schedule({
          after: 10,
          action: () => this.setData("thirdEntryScheduleFired", true),
        });
      },
    },
  },
});

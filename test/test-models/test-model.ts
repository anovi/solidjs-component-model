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
    this.schedule(
      {
        action: () => {
          this.setData("some", value);
        },
      },
      10
    );
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
        this.schedule(
          {
            target: "Default",
            action: () => {
              this.setData("delayedFired", true);
            },
          },
          50
        );
        this.schedule(
          {
            action: () => {
              this.setData("secondScheduleFired", true);
            },
          },
          60
        );
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
        this.schedule(
          {
            action: () => {
              this.setData("thirdEntryScheduleFired", true);
            },
          },
          10
        );
      },
    },
  },
});

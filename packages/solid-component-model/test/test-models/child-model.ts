import { ComponentModel, type StateChartConfig } from "../../src";
import { WithStateChart } from "../../src/create-chart";
import { ParentModel } from "./parent-model";

type ChildModelData = {
  some: string;
};

type Events = { type: "some"; value: string };

class ChildModelB extends ComponentModel<ChildModelData, Events> {
  declare protected parent: InstanceType<typeof ParentModel>;

  constructor() {
    super({
      some: "info",
    });
  }
}

const config = {
  initial: "default",
  states: {
    default: {
      entry() {
        this.schedule({
          after: 10,
          action: () => {
            this.parent.someEvent("from child");
          },
        });
      },
      on: {
        some: {
          action(ev) {
            this.setData("some", ev.value);
          },
        },
      },
    },
  },
} satisfies StateChartConfig<ChildModelB, Events>;

export const ChildModel = WithStateChart(ChildModelB, config);

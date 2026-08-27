import { action, ComponentModel } from "../../src";
import { WithStateChart } from "../../src/create-chart";
import type { StateChartConfig } from "../../src/state-chart";
import { ChildModel } from "./child-model";
import { someObservableCounter } from "./invokables";

type ParentModelData = {
  some: string;
  children: InstanceType<typeof ChildModel>[];
  counter: number;
};

type Events =
  | { type: "SOME"; value: string }
  | { type: "SWITCH" }
  | { type: "ADD" }
  | { type: "REMOVE"; id: string };

const config = {
  initial: "default",
  entry() {
    this.invokeObservable(someObservableCounter, {
      next: {
        action: event => {
          this.setData("counter", event.value);
        },
      },
    });
  },
  on: {
    ADD: {
      action() {
        const child = new ChildModel();
        this.setData("children", this.data.children.length, child);
        child.start();
      },
    },
    REMOVE: {
      action(ev) {
        const index = this.data.children.findIndex(m => m._id === ev.id);
        if (index < 0) return;
        this.data.children[index].stop();
        this.setData("children", [
          ...this.data.children.slice(0, index),
          ...this.data.children.slice(index + 1),
        ]);
      },
    },
  },
  states: {
    default: {
      on: {
        SOME: {
          action(ev) {
            this.setData("some", ev.value);
          },
        },
        SWITCH: {
          target: "some",
        },
      },
    },
    some: {
      on: {
        SWITCH: {
          target: "default",
        },
      },
    },
  },
} satisfies StateChartConfig<ParentModelB, Events>;

class ParentModelB extends ComponentModel<ParentModelData, Events> {
  static config = config;

  static childTypes = {
    Child: ChildModel,
  };

  constructor() {
    super({
      some: "info",
      children: [],
      counter: 0,
    });
  }

  @action
  someEvent(value: string) {
    this.default({ type: "SOME", value });
  }

  @action
  addItem() {
    this.dispatch({ type: "ADD" });
  }

  @action
  sendToChildren() {
    this.data.children.forEach(ch =>
      ch.dispatch({ type: "some", value: "from parent" })
    );
  }

  protected default(ev: Events) {
    if (ev.type === "SOME") this.setData("some", ev.value);
  }
}
export const ParentModel = WithStateChart(ParentModelB, config);

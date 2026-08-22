import { ComponentModel } from "../../src";
import { WithStateChart } from "../../src/create-chart";
import { ChildModel } from "./child-model";

type ParentModelData = {
  some: string;
  children: InstanceType<typeof ChildModel>[];
};

type Events =
  | { type: "SOME"; value: string }
  | { type: "SWITCH" }
  | { type: "ADD" }
  | { type: "REMOVE"; id: string };

class ParentModel extends ComponentModel<ParentModelData, Events> {
  static childTypes = {
    Child: ChildModel,
  };

  #customProp = "some";

  get customProp() {
    return this.#customProp;
  }

  set customProp(val: string) {
    this.#customProp = val;
  }

  constructor() {
    super({
      some: "info",
      children: [],
    });
  }

  getPersistedSnapshot() {
    const json = this.toJSON();
    Object.assign(json, { customProp: this.customProp });
    return json;
  }

  protected applyPersistedSnapshot(snapshot: any) {
    this.#customProp = snapshot.customProp;
  }

  someEvent(value: string) {
    this.default({ type: "SOME", value });
  }

  addItem() {
    this.dispatch({ type: "ADD" });
  }

  sendToChildren() {
    this.data.children.forEach(ch =>
      ch.dispatch({ type: "some", value: "from parent" })
    );
  }

  protected default(ev: Events) {
    if (ev.type === "SOME") this.setData("some", ev.value);
  }
}

export const CustomizedParentModelMachine = WithStateChart(ParentModel, {
  initial: "default",
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
      initial: "other",
      states: {
        other: {},
        govno: {},
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
});

import { ComponentModel } from "../../src";
import { WithStateChart } from "../../src/create-chart";

class BottomChild extends ComponentModel<ParentModelData, Events> {
  constructor() {
    super({
      some: "info",
      children: [],
      counter: 0,
    });
  }
}

export const BottomChildModel = WithStateChart(BottomChild, {
  on: {
    ADD: {
      action() {},
    },
    REMOVE: {
      action() {},
    },
  },
});

/* ---------------------------------------------------------- */

class TopChild extends ComponentModel<ParentModelData, Events> {
  static childTypes = {
    BottomChildModel: BottomChildModel,
  };
  constructor() {
    super({
      some: "info",
      children: [],
      counter: 0,
    });
  }
}

export const TopChildModel = WithStateChart(TopChild, {
  entry() {
    console.log("🔴 entry");
    const child = new BottomChildModel();
    this.setData("children", this.data.children.length, child);
    child.start();
  },
  on: {
    ADD: {
      action() {
        const child = new BottomChildModel();
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
});

/* ---------------------------------------------------------- */

type ParentModelData = {
  some: string;
  children: InstanceType<typeof TopChildModel>[];
  counter: number;
};

type Events = { type: "ADD" } | { type: "REMOVE"; id: string };

class ParenTriple extends ComponentModel<ParentModelData, Events> {
  static childTypes = {
    Child: TopChildModel,
  };
  constructor() {
    super({
      some: "info",
      children: [],
      counter: 0,
    });
  }
}

export const ParenTripleMachine = WithStateChart(ParenTriple, {
  on: {
    ADD: {
      action() {
        const child = new TopChildModel();
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
});

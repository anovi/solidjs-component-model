import { ComponentModel, type Snapshot } from "../../src";
import { WithStateChart } from "../../src/create-chart";
import { ChildModel } from "./child-model";

type ParentModelData = {
  some: string;
};

type Events =
  | { type: "SOME"; value: string }
  | { type: "SWITCH" }
  | { type: "ADD" }
  | { type: "REMOVE"; id: string };

class ParentModelHiddenChildrenB extends ComponentModel<
  ParentModelData,
  Events
> {
  static childTypes = {
    Child: ChildModel,
  };

  get childrenLength(): number {
    return this.__children.length;
  }

  constructor() {
    super({
      some: "info",
    });
  }

  someEvent(value: string) {
    this.default({ type: "SOME", value });
  }

  addItem() {
    this.dispatch({ type: "ADD" });
  }

  sendToChildren() {
    this.__children.forEach(ch =>
      ch.dispatch({ type: "some", value: "from parent" })
    );
  }

  getChildrenData() {
    return this.__children.map(ch => ch.data.some);
  }

  protected default(ev: Events) {
    if (ev.type === "SOME") this.setData("some", ev.value);
  }

  protected addChild() {
    const child = new ChildModel();
    child.start();
    this.__children.push(child);
  }

  protected removeChild(id: string) {
    const index = this.__children.findIndex(m => m._id === id);
    if (index < 0) return;
    this.__children[index].stop();
    this.__children = [
      ...this.__children.slice(0, index),
      ...this.__children.slice(index + 1),
    ];
  }

  override toJSON(): Snapshot<string, ParentModelData> {
    const sn = super.toJSON();
    (sn as any).__children = this.__children.map(ch => ch.toJSON());
    return sn;
  }

  // TODO: terrible code, don't now what to do yet
  static override fromJSON<
    TThis extends new (
      ...args: any[]
    ) => ComponentModel<ParentModelData, Events>,
  >(this: TThis, snapshot: unknown): InstanceType<TThis> {
    const inst = super.fromJSON(snapshot) as InstanceType<TThis>;

    (inst as ParentModelHiddenChildrenB).__children = [];

    return inst;
  }

  private __children: InstanceType<typeof ChildModel>[] = [];
}

export const ParentModelHiddenChildren = WithStateChart(
  ParentModelHiddenChildrenB,
  {
    initial: "default",
    on: {
      ADD: {
        action() {
          this.addChild();
        },
      },
      REMOVE: {
        action(ev) {
          this.removeChild(ev.id);
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
  }
);

import { describe, it, assert } from "vitest";
import { createRoot, createMemo, untrack, createEffect } from "solid-js";
import { ComponentModel, TerminalLogger } from "../src";
import { WithStateChart } from "../src/create-chart";
import { createPromiseResolver, sleep } from "./test-kit";
void TerminalLogger;

type ModelData = Record<string, never>;

type Events = { type: "EDIT" };

class TestModelBase extends ComponentModel<ModelData, Events> {
  nonReactiveObject?: { id: string };

  constructor() {
    super({});
  }
}

const TestModel = WithStateChart(TestModelBase, {
  initial: "idle",
  states: {
    idle: {
      on: {
        EDIT: {
          target: "edit",
        },
      },
    },
    edit: {
      entry() {
        this.nonReactiveObject = { id: "item-1" };
      },
    },
  },
});

// ComponentModel.configure({
//   logger: new TerminalLogger(),
// });

describe("reactivity", () => {
  it("an entry action takes an effect before subscribers notified about a state change", async () => {
    const [promise, done] = createPromiseResolver();
    createRoot(async dispose => {
      const model = new TestModel();
      model.start();

      const memo = createMemo(() => {
        const state = untrack(() => model.state());
        if (model.matches("edit")) {
          assert.isDefined(
            model.nonReactiveObject,
            "Expected non-reactive object to be set in edit state"
          );
          assert.deepEqual(model.nonReactiveObject, { id: "item-1" });
          done();
        }
        ``;
        return { state, object: model.nonReactiveObject };
      });

      let firstRun = true;
      createEffect(() => {
        if (firstRun) void memo(); // Subscribes
        firstRun = false;
      });

      // Trigger event to switch to 'edit' state
      model.dispatch({ type: "EDIT" });

      await sleep(0);

      dispose();
    });
    return promise;
  });
});

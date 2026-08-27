import { describe, it, assert } from "vitest";
import {
  createRoot,
  createMemo,
  untrack,
  createEffect,
  createRenderEffect,
} from "solid-js";
import { ComponentModel, TerminalLogger } from "../src";
import { WithStateChart } from "../src/create-chart";
import { createPromiseResolver, sleep } from "./test-kit";
void TerminalLogger;

type ModelData = Record<string, never>;

type Events = { type: "EDIT" } | { type: "PING" } | { type: "NEXT" };

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
        PING: {
          target: "active",
        },
      },
    },
    active: {
      on: {
        NEXT: {
          target: "done",
        },
      },
    },
    edit: {
      entry() {
        this.nonReactiveObject = { id: "item-1" };
      },
    },
    done: {},
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

  it("calling dispatch in a reactive context does not cause reactive re-computation on subsequent state changes", async () => {
    return createRoot(async dispose => {
      const model = new TestModel();
      model.start();

      let effectRunCount = 0;

      createEffect(() => {
        effectRunCount++;
        // Dispatching an event inside an effect (e.g. during component mounting/setup)
        model.dispatch({ type: "PING" });
      });

      await sleep(0);
      assert.equal(effectRunCount, 1, "Effect should run once initially");
      assert.equal(model.state(), "active");

      // Later, the model changes state again
      model.dispatch({ type: "NEXT" });
      await sleep(0);

      assert.equal(model.state(), "done");
      // The effect should NOT re-run because dispatching PING should not leak a state subscription
      assert.equal(
        effectRunCount,
        1,
        "Effect should not re-run when model state changes"
      );

      dispose();
    });
  });

  it("calling dispatch in createRenderEffect does not create a reactive subscription to model state", () => {
    createRoot(dispose => {
      const model = new TestModel();
      model.start();

      let renderEffectRunCount = 0;

      createRenderEffect(() => {
        renderEffectRunCount++;
        model.dispatch({ type: "PING" });
      });

      assert.equal(renderEffectRunCount, 1);
      assert.equal(model.state(), "active");

      // Dispatching NEXT transitions active -> done
      model.dispatch({ type: "NEXT" });

      assert.equal(model.state(), "done");
      assert.equal(
        renderEffectRunCount,
        1,
        "RenderEffect should not re-run on subsequent state transitions"
      );

      dispose();
    });
  });

  it("calling start() in a reactive context does not cause reactive re-computation on subsequent state changes", async () => {
    return createRoot(async dispose => {
      const model = new TestModel();

      let effectRunCount = 0;

      createEffect(() => {
        effectRunCount++;
        model.start();
      });

      await sleep(0);
      assert.equal(effectRunCount, 1, "Effect should run once initially");
      assert.equal(model.state(), "idle");

      // Later, the model changes state
      model.dispatch({ type: "PING" });
      await sleep(0);

      assert.equal(model.state(), "active");
      assert.equal(
        effectRunCount,
        1,
        "Effect should not re-run when model state changes"
      );

      dispose();
    });
  });

  it("calling toJSON() in a reactive context does not cause reactive re-computation on subsequent state changes", async () => {
    return createRoot(async dispose => {
      const model = new TestModel();
      model.start();

      let effectRunCount = 0;

      createEffect(() => {
        effectRunCount++;
        const snapshot = model.toJSON();
        void snapshot;
      });

      await sleep(0);
      assert.equal(effectRunCount, 1, "Effect should run once initially");

      // Later, the model changes state
      model.dispatch({ type: "PING" });
      await sleep(0);

      assert.equal(model.state(), "active");
      assert.equal(
        effectRunCount,
        1,
        "Effect should not re-run when model state changes"
      );

      dispose();
    });
  });
});

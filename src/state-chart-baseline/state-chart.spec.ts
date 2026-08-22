/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TransitionStep } from "..";
import { StateChart, Interpreter } from ".";
import { StatePath } from "./state-path";

function assertSteps(
  generator: Generator<TransitionStep<any, any>, void>,
  steps: TransitionStep<any, any>[]
) {
  let i = 0;
  for (const step of generator) {
    assert.deepEqual(step, steps[i]);
    i++;
  }
  assert.equal(steps.length, i);
}

function runGeneratorSilently(
  generator: Generator<TransitionStep<any, any>, void>
) {
  for (const step of generator) {
    void step;
    // console.log(step)
  }
}

const Model = {
  doThing: () => undefined,
};

type Events = { type: "Some" };

describe("StateChart", function () {
  let graph: StateChart<typeof Model, Events>;
  let runtime: Interpreter<typeof Model, Events>;

  beforeEach(function () {
    graph = StateChart.create<typeof Model>({
      initial: "default",
      states: {
        default: {
          on: {
            SOME: { target: "some" },
            ALWAYS: { target: "with_always" },
          },
        },
        some: {
          on: {
            ALWAYS: { target: "with_always" },
          },
        },
        with_always: {
          always: { target: "from_always" },
          on: {
            ALWAYS: { target: "from_always" },
          },
        },
        from_always: {},
        with_children: {
          initial: "child1",
          states: {
            child1: {},
            child2: {},
          },
        },
      },
    });
    runtime = graph.createRuntime(Model);
  });

  it("starts with empty path step", async function () {
    assertSteps(runtime.transition("", ""), [
      { exit: false, path: "", effect: undefined },
      { exit: false, path: "default", effect: undefined },
    ]);
  });

  it("continue transition when always is met", async function () {
    assertSteps(runtime.transition("", "default"), [
      { exit: false, path: "", effect: undefined },
      { exit: false, path: "default", effect: undefined },
    ]);
    assertSteps(runtime.transition("default", "with_always"), [
      { exit: true, path: "default", effect: undefined },
      { exit: false, path: "with_always", effect: undefined },
    ]);
    const handler = runtime.getMostSpecificHandler("with_always");
    assert.ok(handler, "Has eventless transition");
    if (handler instanceof Error) {
      throw "Should not be error";
    }
  });

  it("it reenters", async function () {
    runGeneratorSilently(runtime.transition("", "default"));
    assertSteps(runtime.transition("default", "default", true), [
      { exit: true, path: "default", effect: undefined },
      { exit: false, path: "default", effect: undefined },
    ]);
  });

  it("defines initial state whithin deep state", async function () {
    runGeneratorSilently(runtime.transition("", "default"));
    assertSteps(runtime.transition("default", "with_children", true), [
      { exit: true, path: "default", effect: undefined },
      { exit: false, path: "with_children", effect: undefined },
      { exit: false, path: "with_children.child1", effect: undefined },
    ]);
  });
});

describe("StatePath", function () {
  it("iterates ancestors without duplicate root", function () {
    const path = new StatePath("first.child");
    const ancestors = [...path.ancestors()];
    assert.equal(ancestors.length, 4);
    assert.equal(ancestors[0], "first.child");
    assert.equal(ancestors[1], "first");
    assert.equal(ancestors[2], "");
    assert.equal(ancestors[3], "");
  });

  it("round-trips through toString, toArray, parent", function () {
    const path = new StatePath("first.child");
    assert.deepEqual(path.toArray(), ["", "first", "child"]);
    assert.equal(path.toString(), "first.child");

    const parent = path.parent();
    assert.ok(parent);
    assert.equal(parent!.toString(), "first");
    assert.deepEqual(parent!.toArray(), ["", "first"]);

    const grandparent = parent!.parent();
    assert.ok(grandparent);
    assert.equal(grandparent!.toString(), "");
    assert.deepEqual(grandparent!.toArray(), [""]);
  });

  it("parent of root is undefined", function () {
    const root = new StatePath("");
    assert.equal(root.parent(), undefined);
  });

  it("length counts segments including root", function () {
    assert.equal(new StatePath("").length, 1);
    assert.equal(new StatePath("a").length, 2);
    assert.equal(new StatePath("a.b").length, 3);
  });
});

describe("StateChart handler lookup", function () {
  it("returns event handlers for root path", function () {
    const chart = StateChart.create({
      on: { SOME: { target: "" } },
    });
    const handlers = chart.getHandlers("", { type: "SOME" } as any);
    assert.ok(handlers);
    assert.equal(handlers!.length, 1);
    assert.equal(handlers![0].target, "");
  });
});

import { bench } from "vitest";
import { StateChart as BaselineStateChart } from "../src/state-chart-baseline";
import { StateChart as NewStateChart } from "../src/state-chart";

const config = {
  initial: "default" as const,
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
      initial: "child1" as const,
      states: {
        child1: {},
        child2: {},
      },
    },
  },
};

const Model = {
  doThing: () => undefined,
};

describe("StateChart.create", () => {
  bench(
    "baseline",
    () => {
      BaselineStateChart.create(config);
    },
    {
      iterations: 10000,
      throws: true,
    }
  );

  bench(
    "new",
    () => {
      NewStateChart.create(config);
    },
    {
      iterations: 10000,
      throws: true,
    }
  );
});

describe("Interpreter.transition", () => {
  const baselineChart = BaselineStateChart.create(config);
  const baselineRuntime = baselineChart.createRuntime(Model);

  const newChart = NewStateChart.create(config);
  const newRuntime = newChart.createRuntime(Model);

  bench(
    "baseline",
    () => {
      for (const _ of baselineRuntime.transition("", "default")) {
        void _;
      }
      for (const _ of baselineRuntime.transition("default", "with_always")) {
        void _;
      }
      for (const _ of baselineRuntime.transition(
        "with_always",
        "from_always"
      )) {
        void _;
      }
      for (const _ of baselineRuntime.transition(
        "from_always",
        "with_children"
      )) {
        void _;
      }
      for (const _ of baselineRuntime.transition(
        "with_children.child1",
        "default",
        true
      )) {
        void _;
      }
    },
    {
      iterations: 10000,
      throws: true,
    }
  );

  bench(
    "new",
    () => {
      for (const _ of newRuntime.transition("", "default")) {
        void _;
      }
      for (const _ of newRuntime.transition("default", "with_always")) {
        void _;
      }
      for (const _ of newRuntime.transition("with_always", "from_always")) {
        void _;
      }
      for (const _ of newRuntime.transition("from_always", "with_children")) {
        void _;
      }
      for (const _ of newRuntime.transition(
        "with_children.child1",
        "default",
        true
      )) {
        void _;
      }
    },
    {
      iterations: 10000,
      throws: true,
    }
  );
});

describe("Interpreter.getMostSpecificHandler", () => {
  const baselineChart = BaselineStateChart.create(config);
  const baselineRuntime = baselineChart.createRuntime(Model);

  const newChart = NewStateChart.create(config);
  const newRuntime = newChart.createRuntime(Model);

  bench(
    "baseline",
    () => {
      baselineRuntime.getMostSpecificHandler("default", { type: "SOME" });
      baselineRuntime.getMostSpecificHandler("some", { type: "ALWAYS" });
      baselineRuntime.getMostSpecificHandler("with_always");
      baselineRuntime.getMostSpecificHandler("with_children.child1", {
        type: "SOME",
      });
    },
    {
      iterations: 50000,
      throws: true,
    }
  );

  bench(
    "new",
    () => {
      newRuntime.getMostSpecificHandler("default", { type: "SOME" });
      newRuntime.getMostSpecificHandler("some", { type: "ALWAYS" });
      newRuntime.getMostSpecificHandler("with_always");
      newRuntime.getMostSpecificHandler("with_children.child1", {
        type: "SOME",
      });
    },
    {
      iterations: 50000,
      throws: true,
    }
  );
});

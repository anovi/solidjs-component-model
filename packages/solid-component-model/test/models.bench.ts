import { bench } from "vitest";
import { assign, createActor, setup } from "xstate";
import { ComponentModel, WithStateChart } from "../src";

const TIMES = 1000;

describe("Parsing YAML document", async () => {
  bench(
    "xstate",
    () => {
      const actor = createActor(machine);
      actor.start();
      for (let index = 0; index < TIMES; index++) {
        actor.send({ type: "SOME", data: "1" });
      }
      actor.stop();
    },
    {
      iterations: 50,
      throws: true,
    }
  );

  bench(
    "model",
    () => {
      const actor = new ModelWithStates();
      actor.start();
      for (let index = 0; index < TIMES; index++) {
        actor.dispatch({ type: "SOME", data: "1" });
      }
      actor.stop();
    },
    {
      iterations: 50,
      throws: true,
    }
  );
});

const machine = setup({
  types: {
    context: {} as {
      data: string;
    },
    events: {} as { type: "SOME"; data: string },
  },
}).createMachine({
  context: { data: "" },
  initial: "default",
  states: {
    default: {
      on: {
        SOME: {
          target: "duper",
          actions: assign({
            data: ({ event }) => event.data,
          }),
        },
      },
    },
    duper: {
      on: {
        SOME: {
          target: "duper",
          actions: assign({
            data: ({ event }) => event.data,
          }),
        },
      },
    },
  },
});

class model extends ComponentModel<
  { data: string },
  { type: "SOME"; data: string }
> {
  constructor() {
    super({ data: "" });
  }
}

const ModelWithStates = WithStateChart(model, {
  initial: "default",
  states: {
    default: {
      on: {
        SOME: {
          target: "duper",
          action(event) {
            this.setData("data", event.data);
          },
        },
      },
    },
    duper: {
      on: {
        SOME: {
          target: "duper",
          action(event) {
            this.setData("data", event.data);
          },
        },
      },
    },
  },
});

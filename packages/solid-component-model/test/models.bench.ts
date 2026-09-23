import { assign, createActor, setup } from "xstate";
import { createComputed, createRoot } from "solid-js";
import { fromActorRef } from "@xstate/solid";
import { ComponentModel, WithStateChart } from "../dist/index.js";

import type { BenchCompareOptions } from "vitest";

// Explicit across suites and saved with the results. Units are milliseconds.
export const benchmarkOptions = {
  time: 1_000,
  iterations: 64,
  warmup: true,
  warmupTime: 500,
  warmupIterations: 64,
  throws: true,
} satisfies BenchCompareOptions;

type BenchEvent =
  { type: "SOME"; data: string } | { type: "TOGGLE"; data: string };
const EVENTS = 1_000;
const LIFECYCLES = 100;
const constantEvents: BenchEvent[] = Array.from({ length: EVENTS }, () => ({
  type: "SOME",
  data: "1",
}));
const changingEvents: BenchEvent[] = Array.from({ length: EVENTS }, (_, i) => ({
  type: "SOME",
  data: String(i),
}));
const togglingEvents: BenchEvent[] = changingEvents.map(event => ({
  ...event,
  type: "TOGGLE",
}));

const machine = setup({
  types: {
    context: {} as { data: string },
    events: {} as BenchEvent,
  },
  actions: { update: assign({ data: ({ event }) => event.data }) },
}).createMachine({
  context: { data: "" },
  initial: "default",
  states: {
    default: {
      on: {
        SOME: { target: "duper", actions: "update" },
        TOGGLE: { target: "duper", actions: "update" },
      },
    },
    duper: {
      on: {
        SOME: { target: "duper", actions: "update" },
        TOGGLE: { target: "default", actions: "update" },
      },
    },
  },
});

class Model extends ComponentModel<{ data: string }, BenchEvent> {
  constructor() {
    super({ data: "" });
  }
}
const ModelWithStates = WithStateChart(Model, {
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
        TOGGLE: {
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
        TOGGLE: {
          target: "default",
          action(event) {
            this.setData("data", event.data);
          },
        },
      },
    },
  },
});

// All expectations are outside timed callbacks. Preallocated event objects are
// shared by both implementations, so dispatch cases do not time event allocation.
function verifyPair(events: BenchEvent[]) {
  const xstate = createActor(machine).start();
  const model = new ModelWithStates();
  model.start();
  try {
    for (const event of events) {
      xstate.send(event);
      model.dispatch(event);
    }
    expect(model.status).toBe("active");
    expect(model.data.data).toBe(events.at(-1)!.data);
    expect(model.data.data).toBe(xstate.getSnapshot().context.data);
    expect(model.state()).toBe(xstate.getSnapshot().value);
  } finally {
    xstate.stop();
    model.stop();
  }
}

test("Lifecycle only — 100 create/start/stop cycles per operation", async ({
  bench,
}) => {
  await bench.compare(
    bench("xstate", () => {
      for (let i = 0; i < LIFECYCLES; i++) createActor(machine).start().stop();
    }),
    bench("model", () => {
      for (let i = 0; i < LIFECYCLES; i++) {
        const model = new ModelWithStates();
        model.start();
        model.stop();
      }
    }),
    benchmarkOptions
  );
});

test("End to end — create/start/1,000 repeated-value dispatches/stop", async ({
  bench,
}) => {
  verifyPair(constantEvents);
  await bench.compare(
    bench("xstate", () => {
      const actor = createActor(machine).start();
      try {
        for (const event of constantEvents) actor.send(event);
      } finally {
        actor.stop();
      }
    }),
    bench("model", () => {
      const actor = new ModelWithStates();
      actor.start();
      try {
        for (const event of constantEvents) actor.dispatch(event);
      } finally {
        actor.stop();
      }
    }),
    benchmarkOptions
  );
});

for (const scenario of [
  {
    name: "same state, repeated value",
    events: constantEvents,
    subscribed: false,
  },
  {
    name: "same state, changing values",
    events: changingEvents,
    subscribed: false,
  },
  {
    name: "alternating states, changing values",
    events: togglingEvents,
    subscribed: false,
  },
  {
    name: "alternating states, changing values, one snapshot subscriber",
    events: togglingEvents,
    subscribed: true,
  },
]) {
  test(`Steady dispatch — 1,000 events: ${scenario.name}`, async ({
    bench,
  }) => {
    verifyPair(scenario.events);
    const xstate = createActor(machine).start();
    const model = new ModelWithStates();
    model.start();
    let xstateObserved = "",
      modelObserved = "";
    const xstateSubscription = scenario.subscribed
      ? xstate.subscribe(snapshot => {
          xstateObserved = snapshot.context.data;
        })
      : undefined;
    const modelSubscription = scenario.subscribed
      ? model.subscribe({
          next: snapshot => {
            modelObserved = snapshot.data.data;
          },
        })
      : undefined;
    try {
      // Establish the same steady state before either task's warmup/timing.
      for (const event of scenario.events) {
        xstate.send(event);
        model.dispatch(event);
      }
      await bench.compare(
        bench("xstate", () => {
          for (const event of scenario.events) xstate.send(event);
        }),
        bench("model", () => {
          for (const event of scenario.events) model.dispatch(event);
        }),
        benchmarkOptions
      );
      expect(model.data.data).toBe(xstate.getSnapshot().context.data);
      expect(model.state()).toBe(xstate.getSnapshot().value);
      if (scenario.subscribed) {
        expect(modelObserved).toBe(scenario.events.at(-1)!.data);
        expect(xstateObserved).toBe(modelObserved);
      }
    } finally {
      xstateSubscription?.unsubscribe();
      modelSubscription?.unsubscribe();
      xstate.stop();
      model.stop();
    }
  });
}

test("Solid reactive consumer — 1,000 alternating-state/changing-value dispatches", async ({
  bench,
}) => {
  const xstate = createActor(machine).start();
  const observed = new ModelWithStates();
  observed.start();
  let observedValueXstate = "";
  let observedValueModel = "";
  let notifications = 0;
  const dispose = createRoot(dispose => {
    createComputed(() => {
      observedValueModel = `${observed.state()}:${observed.data.data}`;
      notifications++;
    });
    return dispose;
  });
  const disposeXstate = createRoot(dispose => {
    const state = fromActorRef(xstate);
    createComputed(() => {
      const snapshot = state();
      observedValueXstate = `${snapshot.value}:${snapshot.context.data}`;
      notifications++;
    });
    return dispose;
  });
  try {
    await bench.compare(
      bench("xstate", () => {
        for (const event of togglingEvents) xstate.send(event);
      }),
      bench("model", () => {
        for (const event of togglingEvents) observed.dispatch(event);
      }),
      benchmarkOptions
    );
    expect(notifications).toBeGreaterThan(EVENTS);
    expect(observedValueModel).toBe(
      `${observed.state()}:${observed.data.data}`
    );
    expect(observedValueXstate).toBe(
      `${xstate.getSnapshot().value}:${xstate.getSnapshot().context.data}`
    );
  } finally {
    dispose();
    disposeXstate();
    xstate.stop();
    observed.stop();
  }
});

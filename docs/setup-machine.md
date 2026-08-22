# Setup a machine

A state machine is defined by creating a `StateChart` configuration and attaching it to a model.

## Defining a state chart

The `StateChart.create` function takes a configuration object describing states, transitions, and effects.

```ts
import { StateChart } from "solid-component-model";

const chart = StateChart.create({
  initial: "idle",
  states: {
    idle: {
      on: {
        START: "running",
      },
    },
    running: {
      on: {
        STOP: "idle",
        FINISH: "done",
      },
    },
    done: {
      type: "final",
    },
  },
});
```

## Attaching a chart to a model

There are two ways to attach a state chart to a model: automatically with the `WithStateChart` helper, or manually with the static `chart` property.

### Using `WithStateChart` (recommended)

The `WithStateChart` function extends your model class, creates the chart internally, and installs convenience methods like `matches`.

```ts
import { WithStateChart } from "solid-component-model";

class MyModelBase extends ComponentModel<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

export const MyModel = WithStateChart(
  MyModelBase,
  {
    initial: "idle",
    states: {
      idle: {
        on: { START: "running" },
      },
      running: {
        on: { STOP: "idle" },
      },
    },
  },
  "MyModel"
);
```

The model instance now has a `matches` method for checking state:

```ts
const model = useModel(MyModel);
const isRunning = model.matches("running"); // true or false
```

## Accessing the model in guards and effects

All functions defined inside a state chart — guards, transition actions, `entry`, and `exit` effects — are executed with `this` bound to the model instance. This is how you access `this.data`, `this.setData`, or call other model methods from inside the machine.

Because the interpreter uses `.call(this, ...)` to run these functions, you must write them as regular `function` methods. Arrow functions capture their surrounding `this` lexically and ignore `.call()`, so `this` inside an arrow function would not point to the model.

```ts
const chart = StateChart.create({
  initial: "idle",
  states: {
    idle: {
      on: {
        START: {
          target: "running",
          // ✅  Correct — method-style function, `this` is the model
          guard() {
            return this.data.ready;
          },
          action() {
            this.setData("startedAt", Date.now());
          },
        },
      },
    },
    running: {
      // ✅ Correct — `this` is the model
      entry() {
        this.setData("status", "running");
      },
      exit() {
        this.setData("status", "stopped");
      },
    },
  },
});
```

Arrow functions will not work as expected:

```ts
// ❌ Wrong — `this` is not the model
action: () => {
  this.setData("startedAt", Date.now()); // Error or wrong `this`
};
```

If you need to reference the model's type inside a guard or effect, define the chart configuration after the model class or use a generic helper so TypeScript can infer `this` correctly.

## Nested states

States can contain child states. When a parent state is entered, its `initial` child is entered automatically.

```ts
const chart = StateChart.create({
  initial: "parent",
  states: {
    parent: {
      initial: "childA",
      states: {
        childA: { on: { NEXT: "childB" } },
        childB: { on: { BACK: "childA" } },
      },
    },
  },
});
```

## Special state types

- `'final'` — a final state. When reached, the model stops.
- `'parallel'` — a parallel state region (cannot have an `initial` property).
- `'history'` — a history state.

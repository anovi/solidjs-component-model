# Effects

Effects are functions that run during the lifecycle of a state machine. There are three kinds: **entry**, **exit**, and **event actions**.

## Entry effect

An entry effect runs when the machine enters a state. It is defined on the state node itself.

```ts
const chart = StateChart.create({
  initial: "idle",
  states: {
    idle: { on: { START: "running" } },
    running: {
      entry() {
        this.setData("startedAt", Date.now());
      },
      on: { STOP: "idle" },
    },
  },
});
```

## Exit effect

An exit effect runs when the machine leaves a state.

```ts
running: {
  entry() { /* ... */ },
  exit() {
    this.setData('lastRun', Date.now());
  },
  on: { STOP: 'idle' }
}
```

## Event action

An action tied to a specific transition runs when that transition is taken, before any exit or entry effects of the involved states.

```ts
idle: {
  on: {
    START: {
      target: 'running',
      action() {
        console.log('Transitioning to running');
      }
    }
  }
}
```

## Execution order

When a transition occurs, effects run in this order:

1. The transition's own **action** (if any).
2. **Exit** effects, from the deepest active state up to the common ancestor.
3. **Entry** effects, from the first new state down to the deepest target state.

This order is guaranteed by the micro-step generation described in the [event loop](./event-loop.md).

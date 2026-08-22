# Transitions

A transition moves the machine from one state to another in response to an event.

## Event-based transitions

The most common transition reacts to a named event. Define them inside the `on` object of a state.

```ts
idle: {
  on: {
    START: "running";
  }
}
```

The shorthand `START: 'running'` means "when the `START` event arrives, go to the `running` state."

You can also write the full form:

```ts
idle: {
  on: {
    START: {
      target: 'running',
      action() { console.log('started') }
    }
  }
}
```

## Multiple handlers for the same event

You can provide an array of handlers. The first one whose guard passes is executed.

```ts
idle: {
  on: {
    SUBMIT: [
      {
        target: "sending",
        guard() {
          return this.data.ready;
        },
      },
      { target: "invalid" },
    ];
  }
}
```

## Reentering a state

Set `reenter: true` to force the machine to exit and re-enter the same state, running exit and entry effects again.

```ts
idle: {
  on: {
    RESET: { target: 'idle', reenter: true }
  }
}
```

## Always transitions

An `always` transition (also called an eventless transition) is checked after every handled event. It does not need an event to trigger.

```ts
idle: {
  always: {
    target: 'running',
    guard() { return this.data.autoStart }
  }
}
```

If the guard passes, the transition happens immediately. If no guard is present, it always fires.

## Target-less transitions

A transition without a `target` only executes its `action` and stays in the current state.

```ts
idle: {
  on: {
    TICK: {
      action() {
        this.setData('ticks', t => t + 1);
      }
    }
  }
}
```

::: warning Action functions must be method-style
Write actions as regular `function` methods, **not arrow functions**. The interpreter calls `.call(this, ...)` on the guard, binding `this` to the current model instance. Arrow functions ignore `.call()`, so `this` would not refer to the model and you would not have access to `this.data` or other model methods.
:::

## Transition properties summary

| Property  | Description                                             |
| --------- | ------------------------------------------------------- |
| `target`  | The state to move to.                                   |
| `reenter` | If `true`, exit and re-enter the same state.            |
| `guard`   | A function that returns `true` to allow the transition. |
| `action`  | A function run when the transition is taken.            |

# Conditional transitions

Sometimes a transition should only happen under certain conditions. Use a **guard** for such a transition.

## Defining a guard

A guard is a function that returns `true` to allow the transition and `false` to block it.

::: warning Guard functions must be method-style
Write guards as regular `function` methods, **not arrow functions**. The interpreter calls `.call(this, ...)` on the guard, binding `this` to the current model instance. Arrow functions ignore `.call()`, so `this` would not refer to the model and you would not have access to `this.data` or other model methods.
:::

```ts
const chart = StateChart.create({
  initial: "idle",
  states: {
    idle: {
      on: {
        SUBMIT: {
          target: "submitting",
          guard() {
            // `this` is the model instance
            return this.data.isValid;
          },
        },
      },
    },
    submitting: {},
  },
});
```

When `SUBMIT` is sent while in `idle`, the machine checks the guard. If it returns `true`, the transition to `submitting` happens. If it returns `false`, the event is ignored and the machine stays in `idle`.

## Multiple guarded transitions

You can list several handlers for the same event. The first one whose guard passes is used.

```ts
idle: {
  on: {
    SUBMIT: [
      {
        target: "submitting",
        guard() {
          return this.data.isValid;
        },
      },
      {
        target: "invalid",
        action() {
          this.setData("error", "Form is not valid");
        },
      },
    ];
  }
}
```

If the first guard returns `false`, the machine tries the next handler. The second handler in the example has no guard, so it acts as a fallback.

## Guards and always transitions

Guards also work on `always` transitions. An `always` transition with a guard that returns `false` simply does not trigger, and the machine remains stable.

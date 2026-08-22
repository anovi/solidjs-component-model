# Scheduler

Models include a built-in scheduler for delaying events. It is a thin wrapper around `setTimeout` that is automatically cleaned up when the model stops.

## Scheduling a delayed event

Use the `schedule` method inside a model method or effect to enqueue an event after a timeout.

```ts
export class MyModel extends ComponentModel<{ shown: boolean }> {
  constructor() {
    super({ shown: false });
  }

  show() {
    this.setData("shown", true);
    // Hide after 3 seconds
    this.schedule(() => this.setData("shown", false), 3000);
  }
}
```

In the example above the model changes the `shown` field to `true` and after a 3000 ms it changes it back.
If the model is destroyed within these 3 seconds, it automatically cleans up the timer.

## Cancelling scheduled tasks

When a state is exited, all scheduled tasks tied to that state are automatically cancelled. You do not need to manage timers manually.

## Manual flush

If you need to cancel all pending timers for a state programmatically, the scheduler supports flushing by tag or state name. In normal use, this happens automatically on state exit.

## Scheduling in state charts

Inside state chart effects—`entry`, `exit`, or an event `action`—you can call `this.schedule` to delay a transition or action.

```ts
const chart = StateChart.create({
  initial: "idle",
  states: {
    idle: {
      on: {
        START: "running",
      },
    },
    running: {
      entry() {
        // After 2 seconds, transition back to idle
        this.schedule({ target: "idle" }, 2000);
      },
      on: {
        STOP: {
          target: "idle",
          action() {
            // Run an action after 500 ms
            this.schedule(
              {
                action: () => console.log("Stopped!"),
              },
              500
            );
          },
        },
      },
    },
  },
});
```

Because `this.schedule` is a method on the model, you can also schedule multiple times from the same effect:

```ts
{
  someState: {
    entry() {
      this.schedule({ target: 'next' }, 1000);
      this.schedule({ action: () => this.setData('warned', true) }, 500);
    }
  },
}
```

When the state is exited, all timers tied to that state are automatically cancelled, so you do not need to manage cleanup manually.

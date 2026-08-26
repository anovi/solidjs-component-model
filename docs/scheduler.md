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
    this.schedule({
      after: 3000,
      action: () => this.setData("shown", false),
    });
  }
}
```

In the example above the model changes the `shown` field to `true` and after a 3000 ms it changes it back.
If the model is destroyed within these 3 seconds, it automatically cleans up the timer.

## Cancelling scheduled tasks

**Automatic**  
When model stops it cancels all schedules tasks automatically.

**Manual**  
There is no way to manually cancel a scheduled task. You need to define it though state chart logic.

**In state machines**  
Scheduled tasks are attached to state where they started. When this state is exited, all scheduled tasks tied to that state are automatically cancelled. You do not need to manage timers manually.

## Scheduling in state charts

Inside state chart `entry` effect, or an event `action` — you can call `this.schedule` to delay a transition or action.

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
        this.schedule({ after: 2000, target: "idle" });
      },
      on: {
        STOP: {
          target: "idle",
          action() {
            // Run an action after 500 ms
            this.schedule({
              after: 500,
              action: () => console.log("Stopped!"),
            });
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
      this.schedule({ after: 1000, target: 'next' });
      this.schedule({ after: 500, action: () => this.setData('warned', true) });
    }
  },
}
```

When the state is exited, all timers tied to that state are automatically cancelled, so you do not need to manage cleanup manually.

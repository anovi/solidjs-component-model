# Invoke

Invoke is the mechanism for asynchronous calls inside a model. You can invoke **promises** and **observables** directly from any action (typically `entry`), and provide a handler with action, target, and guard.

Invoked effects are bound to the **state** that created them. When the machine exits that state, the invocation is automatically aborted (for promises) or unsubscribed (for observables).

## Invoking a promise

Use `this.invokePromise()` inside an action to start an async operation and react to its outcome with transitions.

```ts
import { ComponentModel } from "solid-component-model";
import { WithStateChart } from "solid-component-model/create-chart";

type UserModelData = { user: User | null; error: string };
type UserModelEvents = { type: "LOAD" } | { type: "RETRY" };

class UserModelBase extends ComponentModel<UserModelData, UserModelEvents> {
  constructor(id: string) {
    super({ id, user: null, error: "" });
  }
}

export const UserModel = WithStateChart(UserModelBase, {
  initial: "idle",
  states: {
    idle: {
      on: { LOAD: { target: "loading" } },
    },
    loading: {
      entry() {
        this.invokePromise(
          signal => fetch(`/api/users/${this.data.id}`, { signal }),
          {
            // A transition on success
            onDone: {
              action: event => {
                this.setData("user", event.result);
              },
              target: "success",
            },
            // A transition on fail
            onError: {
              action: event => {
                this.setData("error", String(event.error));
              },
              target: "error",
            },
          }
        );
      },
      on: {
        RETRY: { target: "loading" }, // re-enter triggers a new invoke
      },
    },
    success: {},
    error: {
      on: { RETRY: { target: "loading" } },
    },
  },
});
```

What it does:

- On the `LOAD` event, the machine switches to the `loading` state and starts fetching the user.
- On success, it sets the user in `data` and switches to the `success` state.
- On failure, it sets the error in `data` and switches to the `error` state.
- When in the `error` state, receiving a `RETRY` event returns the machine to `loading` to try again.

### Guarded `onDone` handlers

Provide an array of handlers with guards to choose a reaction based on the result:

```ts
entry() {
  this.invokePromise(
    (signal) => fetchConfig(signal),
    {
      onDone: [
        {
          guard: (event) => event.result.version === 'v2',
          action: (event) => this.setData('config', event.result),
          target: 'ready'
        },
        {
          action: (event) => this.setData('legacyConfig', event.result),
          target: 'legacy'
        }
      ]
    }
  );
}
```

## Invoking an observable

Use `this.invokeObservable()` inside an action to subscribe to a continuous stream of values—such as timers, WebSockets, or event feeds—and react to incoming items, errors, or completion.

Unlike promises, which produce a single result and finish, observables emit values over time. By invoking an observable in a state's `entry` action, the subscription's lifecycle is automatically bound to that state. When the machine exits the state, it unsubscribes automatically, preventing memory leaks and orphaned listeners without manual cleanup.

```ts
import { interval } from "rxjs";
import { ComponentModel } from "solid-component-model";
import { WithStateChart } from "solid-component-model/create-chart";

type TimerModelData = { count: number; error: string };
type TimerModelEvents = { type: "START" } | { type: "STOP" };

class TimerModelBase extends ComponentModel<TimerModelData, TimerModelEvents> {
  constructor() {
    super({ count: 0, error: "" });
  }
}

export const TimerModel = WithStateChart(TimerModelBase, {
  initial: "idle",
  states: {
    idle: {
      on: { START: { target: "running" } },
    },
    running: {
      entry() {
        this.invokeObservable(interval(1000), {
          // Fires on every emitted value
          next: {
            action: event => {
              this.setData("count", this.data.count + 1);
            },
          },
          // Handles stream errors
          error: {
            action: event => {
              this.setData("error", String(event.error));
            },
            target: "error",
          },
          // Handles stream completion
          complete: {
            target: "idle",
          },
        });
      },
      on: {
        STOP: { target: "idle" }, // Exiting 'running' automatically unsubscribes
      },
    },
    error: {},
  },
});
```

What it does:

- On the `START` event, the machine switches to the `running` state and subscribes to the observable.
- On each emitted value (`next`), it increments `count` in `data`.
- If the stream encounters an error (`error`), it sets the error in `data` and switches to the `error` state.
- If the stream completes (`complete`), the machine transitions back to `idle`.
- On the `STOP` event, the machine switches to `idle`. Exiting the `running` state automatically unsubscribes from the observable and stops the timer.

### Stream handlers and lifecycle

Each handler in `this.invokeObservable()` behaves like a transition and supports `action`, `target`, and `guard`:

- **`next`** — Runs on every emitted value with `{ value }`. Use this to continuously update model data or run actions as items arrive.
- **`error`** — Runs when the observable emits an error with `{ error }`. Defining an `error` handler lets you transition to an error state or handle the failure gracefully. If omitted, unhandled stream errors switch the model to `error` status.
- **`complete`** — Runs when the observable completes naturally. Use this to transition to a subsequent state once the stream is finished.

### Automatic unsubscription

When using a state chart, you do not need to store subscription references or unsubscribe manually. Leaving the state that started the invocation automatically cancels the subscription and stops processing future stream emissions.

## Models without a state chart

Models without a state chart can also invoke promises and observables from any action or method.

Since there are no state transitions to trigger automatic cleanup on state exit, invoked operations remain active for the lifetime of the model and are **automatically cleaned up when the model stops** (e.g. when `model.stop()` is called or when the component unmounts).

```ts
import { ComponentModel, action } from "solid-component-model";

type ItemsModelData = { items: Item[]; loading: boolean };

class ItemsModel extends ComponentModel<ItemsModelData> {
  constructor() {
    super({ items: [], loading: false });
  }

  @action
  load() {
    this.setData("loading", true);

    this.invokePromise(signal => fetchItems(signal), {
      onDone: {
        action: event => {
          this.setData("items", event.result);
          this.setData("loading", false);
        },
      },
      onError: {
        action: event => {
          console.error("Failed to load", event.error);
          this.setData("loading", false);
        },
      },
    });
  }
}
```

The same applies to observables—the subscription remains active and automatically cleans up when the model stops:

```ts
import { ComponentModel, action } from "solid-component-model";

class LiveUpdatesModel extends ComponentModel<{ price: number }> {
  constructor() {
    super({ price: 0 });
  }

  @action
  startListening() {
    this.invokeObservable(priceFeed$, {
      next: {
        action: event => this.setData("price", event.value),
      },
    });
  }
}
```

## Error handling

- **Unhandled promise rejection** — if `onError` is omitted, the model transitions to `error` status and the error is emitted through the observable error channel.
- **Unhandled observable error** — same behavior: model goes to `error` status.
- **Handled errors** — when `onError` is provided, the model stays active and the handler runs.

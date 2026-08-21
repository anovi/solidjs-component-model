# Invoke

Invoke is the mechanism for asyncronous calls inside a model. You can invoke **promises** and **observables** directly from any action (typically `entry`), and provide a handler with action, target, and guard.

Invoked effects are bound to the **state** that created them. When the machine exits that state, the invocation is automatically aborted (for promises) or unsubscribed (for observables).

## Invoking a promise

Use `this.invokePromise()` inside an action to start an async operation and react to its outcome.

```ts
import { ComponentModel } from 'solid-component-model';
import { WithStateChart } from 'solid-component-model/create-chart';

type UserModelData = { user: User | null; error: string };
type UserModelEvents = { type: 'LOAD' } | { type: 'RETRY' };

class UserModelBase extends ComponentModel<UserModelData, UserModelEvents> {
  constructor() {
    super({ user: null, error: '' });
  }
}

export const UserModel = WithStateChart(UserModelBase, {
  initial: 'idle',
  states: {
    idle: {
      on: { LOAD: { target: 'loading' } }
    },
    loading: {
      entry() {
        this.invokePromise(
          (signal) => fetchUser(signal),
          {
            onDone: {
              action: (event) => {
                this.setData('user', event.result);
              },
              target: 'success'
            },
            onError: {
              action: (event) => {
                this.setData('error', String(event.error));
              },
              target: 'error'
            }
          }
        );
      },
      on: {
        RETRY: { target: 'loading' } // re-enter triggers a new invoke
      }
    },
    success: {},
    error: {
      on: { RETRY: { target: 'loading' } }
    }
  }
});
```

### `invokePromise` API

```ts
this.invokePromise(
  (signal: AbortSignal) => Promise<T>,
  {
    onDone: Handler | Handler[],
    onError?: Handler
  }
);
```

| Parameter | Description |
|-----------|-------------|
| `signal` | An `AbortSignal` that fires when the state is exited. Use it to cancel the underlying fetch or operation. |
| `onDone` | Called when the promise resolves. Supports a single handler or an array of guarded handlers. |
| `onError` | Called when the promise rejects. If omitted, the model moves to `error` status. |

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

Use `this.invokeObservable()` to subscribe to a stream of values.

```ts
import { interval } from 'rxjs';
import { ComponentModel } from 'solid-component-model';
import { WithStateChart } from 'solid-component-model/create-chart';

type TimerModelData = { count: number };
type TimerModelEvents = { type: 'START' } | { type: 'STOP' };

class TimerModelBase extends ComponentModel<TimerModelData, TimerModelEvents> {
  constructor() {
    super({ count: 0 });
  }
}

export const TimerModel = WithStateChart(TimerModelBase, {
  initial: 'idle',
  states: {
    idle: {
      on: { START: { target: 'running' } }
    },
    running: {
      entry() {
        this.invokeObservable(
          interval(1000),
          {
            next: {
              action: (event) => {
                this.setData('count', this.data.count + 1);
              }
            },
            error: {
              action: () => {
                console.error('Timer stream failed');
              }
            },
            complete: {
              action: () => {
                console.log('Timer finished');
              }
            }
          }
        );
      },
      on: { STOP: { target: 'idle' } }
    }
  }
});
```

### `invokeObservable` API

```ts
this.invokeObservable(
  observable: Observable<T>,
  {
    next?: Handler,
    error?: Handler,
    complete?: Handler
  }
);
```

| Handler | When it fires |
|---------|---------------|
| `next` | On every emitted value. Receives `{ value }`. |
| `error` | When the observable errors. If omitted, the model moves to `error` status. |
| `complete` | When the observable completes. |

## Model without a state chart

Models without a state chart can also invoke promises and observables from any method. Since there is no state exit to trigger automatic cleanup, you should store the cleanup function and call it manually (for example in `onCleanup`).

```ts
class PlainModel extends ComponentModel<{ items: Item[]; loading: boolean }> {
  #cleanup?: () => void;

  constructor() {
    super({ items: [], loading: false });
  }

  load() {
    this.setData('loading', true);

    this.#cleanup = this.invokePromise(
      (signal) => fetchItems(signal),
      {
        onDone: (event) => {
          this.setData('items', event.result);
          this.setData('loading', false);
        },
        onError: (event) => {
          console.error('Failed to load', event.error);
          this.setData('loading', false);
        }
      }
    );
  }

  protected onCleanup() {
    this.#cleanup?.();
  }
}
```

For observables without a state chart the pattern is the same:

```ts
class LiveUpdatesModel extends ComponentModel<{ price: number }> {
  #unsubscribe?: () => void;

  startListening() {
    this.#unsubscribe = this.invokeObservable(
      priceFeed$,
      {
        next: (event) => this.setData('price', event.value)
      }
    );
  }

  stopListening() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  protected onCleanup() {
    this.stopListening();
  }
}
```

## Lifecycle of an invocation

<!-- 1. **Start** — The action runs and calls `invokePromise` or `invokeObservable`.
2. **Active** — The async work runs. If the state is exited, the `AbortSignal` fires (for promises) or the subscription is unsubscribed (for observables).
3. **Result** — `onDone`, `next`, `error`, or `complete` handlers are executed as internal events inside the model's queue.
4. **Cleanup** — If the effect function returns a cleanup function, it is called after abortion or when the invocation ends. -->

## Error handling

- **Unhandled promise rejection** — if `onError` is omitted, the model transitions to `error` status and the error is emitted through the observable error channel.
- **Unhandled observable error** — same behavior: model goes to `error` status.
- **Handled errors** — when `onError` is provided, the model stays active and the handler runs.


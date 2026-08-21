# Errors handling

An error can occur in:

- Effects
	- Event effects
	- Transition effects (Entry/Exit/Always)
- Guards
- Inside invoked objects:
	- Invoked promise
	- Invoked observable

## How different stages treat errors

| Phase                                   | Error means                                                 | Machine status | Transition?            | Report error? | Error type                |
| --------------------------------------- | ----------------------------------------------------------- | -------------- | ---------------------- | ------------- | ------------------------- |
| **Guard**                               | Machine couldn't determine whether a transition is enabled  | `error`        | **No**                 | Yes           | `MachineMalformed`        |
| **Transition resolution**               | Invalid target, ambiguous transition, malformed state chart | `error`        | **No**                 | Yes           | `MachineMalformed`        |
| **Event effect**                        | Side effect failed                                          | `active`       | Continue               | Yes           | `EffectFailed`            |
| **Exit effect**                         | Side effect failed                                          | `active`       | Continue               | Yes           | `EffectFailed`            |
| **Entry effect**                        | Side effect failed                                          | `active`       | Continue               | Yes           | `EffectFailed`            |
| **Invoked promise** (no `onError`)      | External operation failed unexpectedly                      | `error`        | —                      | Yes           | `MachineMalformed`        |
| **Invoked promise** (with `onError`)    | Expected failure path                                       | `active`       | According to `onError` | —             | —                         |
| **Invoked observable** (no `onError`)   | External operation failed unexpectedly                      | `error`        | —                      | Yes           | `MachineMalformed`        |
| **Invoked observable** (with `onError`) | Expected failure path                                       | `active`       | According to `onError` | —             | —                         |

- **`EffectFailed`** — thrown when an event, entry, or exit effect throws. The error is logged and the machine stays `active`.
- **`MachineMalformed`** — thrown when a guard throws, when a transition cannot be resolved, or when an invoked promise/observable errors without a handler. The machine switches to `error` status and stops.

## Unhandled errors

When an uncaught `MachineMalformed` error happens:

- Machine switches to `error` status and stops.
- Stops all scheduled events.
- Stops all invoked objects.
- Emits the error through the model's observable error channel.

You can observe this via `subscribe`:

```ts
model.subscribe({
    error(err) {
        // err is the MachineMalformed instance
    }
});
```
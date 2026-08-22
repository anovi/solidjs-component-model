# Model

## What is a model

A model is a view model or a service.

Each model:

- Accepts and handles events
- Can emit events
- Has a **Scheduler** for planning async actions
- Has a **Queue** for processing actions
- Has reactive `data` field and encapsulates how data updates
- Can have fields and methods defined by a developer
- Can have a [state chart](./setup-machine.md) (optionally)

## Properties

### `data`

A reactive data store defined by developer.

### `state`

A fininte state, defined through a state chart. For a model without the state chart the value is always `""`.

### `status`

Lifecycle status. Can be either one of these statuses:

- `"idle"`: the model did not start yet.
- `"active"`: the model is active, accept and emit events.
- `"stopped"`: the model is stopped with calling of the `.stop()`.
- `"error"`: the model is stopped because of an error.
- `"done"`: the model has reached a `final` state and stopped.

### `error`

Error that caused stopping the model with `error` status.

### `_id`

A unique id of the model (UUID), generated automatically.

## Model with state chart

A model can be with or without state chart.
A model without state chart behaves like a state-machine with single state.

A state chart is attached to a model and the model becomes a state machine.

???

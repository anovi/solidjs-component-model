# Emitting events

Models can emit events to the outside world. This is useful for notifying parent components, coordinators, or other models about something that happened.

## Defining emitted events

When you create a model, you can type the events it emits as the third generic parameter.

```ts
type EmittedEvents =
  { type: "SAVED"; id: string } | { type: "ERROR"; message: string };

class MyModel extends ComponentModel<MyData, MyEvents, EmittedEvents> {
  // ...
}
```

## Emitting an event

Call `this.emit` inside a model method or effect.

```ts
class MyModel extends ComponentModel<MyData, MyEvents, EmittedEvents> {
  async save() {
    try {
      await api.save(this.data);
      this.emit({ type: "SAVED", id: this.data.id });
    } catch (err) {
      this.emit({ type: "ERROR", message: err.message });
    }
  }
}
```

Emitted events are dispatched asynchronously through a microtask, so they do not block the current execution.

## Subscribing to emitted events

From outside the model, you can subscribe either by event type or with a full observer.

### By event type

```ts
const unsub = model.on("SAVED", event => {
  console.log("Saved!", event.id);
});
```

Call `unsub.unsubscribe()` to stop listening.

### With an observer

```ts
const unsub = model.subscribe({
  next: event => console.log("Event:", event),
  error: err => console.error("Model failed", err),
  complete: () => console.log("Model stopped"),
});
```

The observer receives all emitted events, as well as completion and error notifications when the model stops.

## Subscribing inside a SolidJS component

Use the `useEvents` helper to subscribe to emitted events with automatic cleanup on unmount.

```tsx
import { useEvents } from "solid-component-model/solidjs";

function MyComponent() {
  const model = useModel(MyModel);

  useEvents(model, {
    SAVED: ev => console.log("Saved!", ev.id),
    ERROR: ev => console.error("Error", ev.message),
  });

  return <button onClick={() => model.save()}>Save</button>;
}
```

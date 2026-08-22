# Using models in components

Models are designed to be used inside SolidJS components. The library provides helpers that tie a model's lifecycle to a component's mount and unmount cycle.

## `useModel`

The `useModel` function creates a model instance, starts it automatically, and stops it when the component unmounts.

```tsx
import { useModel } from "solid-component-model/solidjs";

function MyComponent() {
  const model = useModel(CounterModel, 1, "a");

  return (
    <button onClick={() => model.increment()}>Count: {model.data.count}</button>
  );
}
```

## Reading reactive data

A model's `data` field is a SolidJS store, so you can read from it directly inside JSX or effects and it will track reactivity automatically.

```tsx
import { createEffect } from "solid-js";

function MyComponent() {
  const model = useModel(CounterModel, 0);

  createEffect(() => {
    console.log("count:", model.data.count);
  });

  return (
    <div>
      {model.data.label}: {model.data.count}
    </div>
  );
}
```

Events like `increment()` can be called from event handlers in JSX.

## Subscribing to emitted events

When a model emits events, you can subscribe to them with the `useEvents` helper. It automatically unsubscribes when the component unmounts.

```tsx
import { useEvents } from "solid-component-model/solidjs";

function MyComponent() {
  const model = useModel(MyModel);

  useEvents(model, {
    SAVED: ev => console.log("Saved!", ev),
    ERROR: ev => console.error("Error", ev),
  });

  return <div>My Component</div>;
}
```

## Sending events

From inside a component you can either call model methods directly, or send events through the model's `send` API.

```tsx
function MyComponent() {
  const model = useModel(MyStateMachine);

  return (
    <button onClick={() => model.send.START({ from: "menu" })}>Start</button>
  );
}
```

The `send` object exposes a method for every event type defined in the machine. You can optionally pass the event payload as the first argument.

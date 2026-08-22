# Data

Every model owns a reactive `data` object. It is a SolidJS store, which means reads are tracked automatically and updates are fine-grained.

## Defining initial data

The initial data shape is provided to the model's constructor.

```ts
export class CounterModel extends ComponentModel<{ count: number }> {
  constructor(start: number) {
    super({ count: start });
  }
}
```

## Accessing data

You can read from `model.data` anywhere. Inside SolidJS JSX or `createEffect`, the read is automatically reactive.

```tsx
const model = useModel(CounterModel, 0);

// Reactive in JSX
<div>{model.data.count}</div>;
```

## Updating data

Inside model methods you update data through `this.setData`. The API is the same as SolidJS `SetStoreFunction`.

```ts
increment() {
  this.setData('count', c => c + 1);
}
```

You can also replace the whole object:

```ts
reset() {
  this.setData({ count: 0 });
}
```

Or update nested fields:

```ts
updateName(name: string) {
  this.setData('user', 'name', name);
}
```

## Data and state machines

When a model has a state chart, its `data` lives independently of the state. You can read or write data from any state, and transitions do not reset data unless you do so inside an effect.

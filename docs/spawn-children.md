# Spawning child models

A child model is a model whose lifecycle is attached to a parent. The parent is responsible for creating, starting, and stopping its children.

## Attaching a child

To make a model a child of another model, create the child instance and call `.start()` inside a parent action. The framework automatically attaches the child lifecycle to the parent.

```typescript
class ParentModel extends ComponentModel<ParentData, ParentEvents> {
  static childTypes = {
    Child: ChildModel,
  };

  protected addChild() {
    const child = new ChildModel();
    child.start(); // attaches to a ParentModel as child
    this.data.children.push(child);
  }
}
```

Once started, the child is bound to the parent:

- Stopping the parent automatically stops all attached children.
- The child can access the parent via `this.parent` (declare it with a type if you need typed access).

## Declaring a parent in child model

```ts
class Child extends ComponentModel<ChildModelData, Events> {
  declare protected parent: InstanceType<typeof ParentModel>;

  // other methods…

  // parent is typed and can be used in actions
  someAction() {
    this.parent.someEvent("from child");
  }
}
```

## Declaring `childTypes`

You **must** declare a static `childTypes` field on the parent class if you want children to be restored from snapshots. It maps the child type key to the child class constructor:

```typescript
class ParentModel extends ComponentModel<ParentData, ParentEvents> {
  static childTypes = {
    Child: ChildModel,
  };
}
```

Without this field, `fromJSON()` / `fromPersistedSnapshot()` will not know which class to instantiate for nested child snapshots.

For full details on snapshot restoration, see [Caching and Restoring Snapshots](./caching.md).

## Parent-child communication

A child can send events to its parent through the `parent` reference:

```typescript
class ChildModel extends ComponentModel<ChildData, ChildEvents> {
  // Declare a parent type to have type inference
  declare protected parent: InstanceType<typeof ParentModel>;

  someAction() {
    this.parent.someEvent("from child");
  }
}
```

The parent can broadcast events to all children by iterating over them:

```typescript
sendToChildren() {
    this.data.children.forEach(ch =>
        ch.dispatch({ type: 'some', value: 'from parent' })
    );
}
```

## Patterns

### Children stored in reactive data

When children are part of the reactive `data` store, state changes automatically notify observers:

```typescript
type ParentData = {
  children: InstanceType<typeof ChildModel>[];
};

class ParentModel extends ComponentModel<ParentData, ParentEvents> {
  constructor() {
    super({ children: [] });
  }

  // If you want restoring the model with children from snapshot:
  // You must provide childTypes when children are stored
  // in reactive data
  static childTypes = {
    Child: ChildModel,
  };

  // Action
  protected addChild() {
    const child = new ChildModel();
    this.setData("children", this.data.children.length, child);
    child.start();
  }
}
```

<!-- See [Caching and Restoring Snapshots](./caching.md) for the full snapshot API. -->

### Children stored outside reactive data

You can also keep children in private fields if you do not need reactivity on the collection itself. You are still responsible for calling `.start()` to attach them:

```typescript
class ParentModel extends ComponentModel<ParentData, ParentEvents> {
  #children: InstanceType<typeof ChildModel>[] = [];

  protected addChild() {
    const child = new ChildModel();
    this.#children.push(child);
    child.start();
  }

  get childrenLength(): number {
    return this.#children.length;
  }
}
```

Children in regular fields will not be serialized unless you define a custom snapshot. See [Caching and Restoring Snapshots](./caching.md) for the full snapshot API.

### Ephemeral children

You can create children without storing them in any field. They are still attached and can send events to the parent. When the parent stops, it stops its children.

```typescript
class ParentModel extends ComponentModel<ParentData, ParentEvents> {
  protected addChild() {
    // Attaches to a ParentModel but isn't stored in any field
    new ChildModel().start();
  }
}
```

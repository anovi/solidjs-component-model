# Caching and Restoring Snapshots

Each model can be serialized to a plain JSON snapshot and later restored from it. This is useful for persisting state across sessions, sending state over the wire, or snapshots in tests.

## Basic snapshot

### Serialize

Call `.toJSON()` on any active model to get a plain object snapshot:

```typescript
const parent = new ParentModel();
parent.start();

const snapshot = parent.toJSON();
// {
//   _id: '...',
//   name: '',
//   state: 'default',
//   status: 'active',
//   data: {}
// }
```

### Restore

Use the static `.fromJSON()` class method to recreate a model from a snapshot. The returned instance keeps the exact type of the class you call it on:

```typescript
const restored = MyModel.fromJSON(snapshot);
restored.start();

// restored is typed as MyModel, not a generic base class
```

State, data, and ID are fully restored. Children models are recreated automatically and put into the same state they had in the snapshot.

## Persisted snapshots with custom fields

If your model holds extra data that is not part of the reactive `data` store (for example, private fields), you can extend the snapshot with custom fields.

### 1. Add fields when serializing — override `getPersistedSnapshot()`

```typescript
class GameSession extends ComponentModel<GameData, GameEvents> {
  #seed: number;
  #difficulty = "normal";

  getPersistedSnapshot() {
    const json = this.toJSON();
    // merge any extra fields into the snapshot
    Object.assign(json, {
      seed: this.#seed,
      difficulty: this.#difficulty,
    });
    return json;
  }
}
```

### 2. Read fields when restoring — override `applyPersistedSnapshot()`

After `fromJSON()` builds the model, `fromPersistedSnapshot()` calls the protected instance hook `applyPersistedSnapshot()`. Override that hook to assign your custom fields back:

```typescript
class GameSession extends ComponentModel<GameData, GameEvents> {
  #seed: number;
  #difficulty = "normal";

  // ... getPersistedSnapshot as above ...

  protected applyPersistedSnapshot(snapshot: any) {
    this.#seed = snapshot.seed;
    this.#difficulty = snapshot.difficulty;
  }
}
```

### 3. Restore

```typescript
const snapshot = game.getPersistedSnapshot();
game.stop();

const restored = GameSession.fromPersistedSnapshot(snapshot);
restored.start();

console.log(restored._id === game._id); // true
```

The static `fromPersistedSnapshot()` stays fully typed — `GameSession.fromPersistedSnapshot(...)` returns a `GameSession`-typed instance, so you do not need any manual casting.

## Restoring child models

If a model contains child models, `fromJSON()` and `fromPersistedSnapshot()` recreate them automatically **provided the parent class declares `static childTypes`**:

```typescript
class ParentModel extends ComponentModel<ParentData, ParentEvents> {
  static childTypes = {
    Child: ChildModel,
  };
}
```

The snapshot stores each child under its type key (`Child` in the example above). During restoration the framework looks up the matching constructor in `childTypes`, instantiates it, and recursively restores the child's state and data.

If you keep children in private fields rather than in the reactive `data` store, you may need to override `getPersistedSnapshot()` and `applyPersistedSnapshot()` to include them manually. See [Spawning Child Models](./spawn-children.md) for patterns on storing and serializing children.

## Important notes

- Always call `.start()` after restoring if you want the model to become active again.
- A restored model keeps the original `_id` from the snapshot, so you can match it against previous records.
- Child models declared in `static childTypes = { ... }` are restored recursively automatically.

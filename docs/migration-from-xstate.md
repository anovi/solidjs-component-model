# Migration from XState

This guide maps XState concepts to their equivalents in `solid-component-model`. Where possible it shows both APIs side-by-side, then highlights the behavioural differences.


## Model vs. machine

In XState the machine *is* the definition and the actor is the running instance. In this library the running instance is a class (`ComponentModel`) and the state chart is attached to it with `WithStateChart`.

## Creating state machines

In XState the machine *is* the definition and the actor is the running instance. In this library the running instance is a class (`ComponentModel`) and the state chart is attached to it with `WithStateChart`.

**XState**

```ts
const feedbackMachine = setup({
  types: {
    context: {} as {
        count: number,
    },
    input: {} as number,
  },
  actions: {
    doSomething: ({ context }) => {
      console.log('Value is:', context.count);
    },
  }
}).createMachine({
  context: ({ input }) => {
    return { count: input }
  },
  entry: { type: 'doSomething' },
  states: {
    idle: { /* ... */ }
  }
});

const feedbackActor = createActor(feedbackMachine);

feedbackActor.start(99);
// logs 'Value is: 99'
```

**ComponentModel**

```ts
type Data = {
    count: number
}

class CounterModel extends ComponentModel<Data> {
    constructor(input: number) {
        super({ count: input });
    }

    protected doSomething() {
        console.log('Value is:', this.data.count);
    }
}

const CounterWithChart = WithStateChart(CounterModel, {
    initial: 'idle',
    entry() { this.doSomething() },
    states: {
        idle: { /* ... */ }
    }
});

const model = new CounterWithChart(42);
model.start();
// logs 'Value is: 42'
```

The class is the model. `WithStateChart` returns a new class that also carries a static `config` property and a `matches(statePath)` method.


## State chart

A state chart extends a model class producing a new class.

```ts
type Events =
    | { type: 'SOME_EVENT' }
    | { type: 'OTHER_EVENT' }

type Emits =
    | { type: 'SOMETHING_HAPPENED' }

type MyModelData = {
    data: string
}

class ModelBase extends ComponentModel<MyModelData, Events, Emits> {
    // Model methods and properties go here.
    // They are reachable from every state-chart action via `this`.
}

// Produces a new class
export const ModelWithEntryTrans = WithStateChart(ModelBase, {
    initial: 'default',
    default: {
        on: {
            SOME_EVENT: {
                target: 'someState'
            }
        },
    },
    someState: {
        entry() {
            this.emit({ type: 'SOMETHING_HAPPENED' })
        },
        on: {
            OTHER_EVENT: {
                target: 'default'
            }
        },
    }
})
```

The configuration object is intentionally similar to XState, but the actions live inside the model class, not in a `createMachine` call.


## Execution context

Actions that the state chart executes run in the model's context, so they can access `this`, call `this.emit()`, `this.setData()`, etc. For this reason every action, guard, entry, and exit handler in the state chart must be written as a regular method function, not as an arrow function. Only method-function syntax preserves the correct `this` binding and lets TypeScript infer the model type in the handler body.

Incorrect (arrow function) — `this` is untyped or wrong, and the library cannot bind the handler to the model instance at runtime:

```ts
{
    entry: () => {
        this.emit({ type: 'SOMETHING_HAPPENED' }) // ❌ won't work as expected
    },
}
```

Correct (method function):

```ts
{
    entry() {
        this.emit({ type: 'SOMETHING_HAPPENED' }) // ✅ runs in model context
    },
}
```

Because the library calls guards and actions with `.call(this, event)` at runtime, arrow functions would receive the wrong `this` value. TypeScript also cannot infer the model class as the `this` type for an arrow property, so autocomplete for model-specific methods would be lost.

## Input

**Xstate**

```ts
import { createActor, setup } from 'xstate';

const feedbackMachine = setup({
  types: {
    context: {} as {
      userId: string;
      feedback: string;
      rating: number;
    },
    input: {} as {
      userId: string;
      defaultRating: number;
    },
  },
}).createMachine({
  context: ({ input }) => ({
    userId: input.userId,
    feedback: '',
    rating: input.defaultRating,
  }),
  // ...
});

const feedbackActor = createActor(feedbackMachine, {
  input: {
    userId: '123',
    defaultRating: 5,
  },
});
```

**ComponentModel**

Constructor arguments serve the same role as XState input. You pass the initial values directly to `super()` and define the class constructor to accept whatever parameters you need.

```ts
import { ComponentModel, WithStateChart } from 'solid-component-model';

type Data = {
  userId: string;
  feedback: string;
  rating: number;
};

type Events = { type: 'SUBMIT' };

class FeedbackModelBase extends ComponentModel<Data, Events> {
  constructor(userId: string, defaultRating: number) {
    super({
      userId,
      feedback: '',
      rating: defaultRating,
    });
  }
}

const FeedbackModel = WithStateChart(FeedbackModelBase, {
  // ...
});

const model = new FeedbackModel('123', 5);
model.start();
```

## Matching the state

Both match hierarchial state but state is represented differently:

**XState**


```ts
// state.value === 'question'
someActor.getSnapshoot().matches('question'); // true

// state.value === { form: 'invalid' }
someActor.getSnapshoot().matches('form'); // true
someActor.getSnapshoot().matches('question'); // false
someActor.getSnapshoot().matches({ form: 'invalid' }); // true
someActor.getSnapshoot().matches({ form: 'valid' }); // false
```

**ComponentModel**

```ts
// state === 'question'
someModel.matches('question'); // true

// state === 'form.invalid'
someModel.matches('form'); // true
someModel.matches('question'); // false
someModel.matches('form.invalid'); // true
someModel.matches('form.valid'); // false
```

## Events and transitions

Events are handled **synchronously**, in contrast to XState where an event is queued and processed on the next microtask.

Dispatching an event is identical in both APIs:

```ts
model.dispatch({ type: 'SOME_EVENT' });
```

A typed `send` proxy is also generated automatically:

```ts
model.send.SOME_EVENT();          // dispatch { type: 'SOME_EVENT' }
model.send.OTHER_EVENT();         // dispatch { type: 'OTHER_EVENT' }
```

Events are dispatched synchronously. The action runs immediately, the transition happens immediately, and any nested dispatches (e.g. a child emitting to a parent) are also resolved before `dispatch` returns.

## Eventless transitions

Eventless ("always") transitions fire automatically after entry actions and whenever the state is re-evaluated. They are useful for redirecting based on conditions without requiring an explicit event.

**XState**

```ts
import { setup, createActor } from 'xstate';

const machine = setup({
  types: {
    context: {} as { count: number },
  },
}).createMachine({
  context: { count: 5 },
  initial: 'checking',
  states: {
    checking: {
      always: [
        {
          guard: ({ context }) => context.count > 10,
          target: 'high',
        },
        {
          target: 'low',
        },
      ],
    },
    high: {},
    low: {},
  },
});
```

**ComponentModel**

```ts
import { ComponentModel, WithStateChart } from 'solid-component-model';

type Data = { count: number };
type Events = never;

class CounterBase extends ComponentModel<Data, Events> {
  constructor() {
    super({ count: 5 });
  }
}

const Counter = WithStateChart(CounterBase, {
  initial: 'checking',
  states: {
    checking: {
      always: [
        {
          guard() {
            return this.data.count > 10;
          },
          target: 'high',
        },
        {
          target: 'low',
        },
      ],
    },
    high: {},
    low: {},
  },
});
```

## Event emitter

Models can emit events to the outside world.

**XState**

```ts
import { setup, createActor } from 'xstate';

const machine = setup({
  types: {
    context: {} as { result: string },
    events: {} as { type: 'FINISH'; value: string },
    output: {} as { result: string },
  },
}).createMachine({
  context: { result: '' },
  initial: 'working',
  states: {
    working: {
      on: {
        FINISH: {
          actions: assign({
            result: ({ event }) => event.value,
          }),
          target: 'done',
        },
      },
    },
    done: {
      type: 'final',
      output: ({ context }) => ({ result: context.result }),
    },
  },
});

const actor = createActor(machine);
actor.subscribe({
  complete() {
    console.log('Finished with:', actor.getSnapshot().output);
  },
});
actor.start();
actor.send({ type: 'FINISH', value: 'hello' });
```

**ComponentModel**

```ts
import { ComponentModel, WithStateChart } from 'solid-component-model';

type Data = { value: string };
type Events = { type: 'FINISH'; value: string };
type Emits = { type: 'DONE'; result: string };

class TaskBase extends ComponentModel<Data, Events, Emits> {
  constructor() {
    super({ value: '' });
  }
}

const TaskModel = WithStateChart(TaskBase, {
  initial: 'working',
  states: {
    working: {
      on: {
        FINISH: {
          target: 'done',
          action(event) {
            this.emit({ type: 'DONE', result: event.value });
          },
        },
      },
    },
    done: {},
  },
});

// Parent listens via subscribe
const task = new TaskModel();
task.subscribe((event) => {
  if (event.type === 'DONE') {
    console.log('Finished with:', event.result);
  }
});
task.start();
task.dispatch({ type: 'FINISH', value: 'hello' });
```

## Raise, sendTo, sendParent

To send event from machine to itself `Xstate` uses `raise` action. It also has actions to `sendTo` (by id), and `sendParent`.

In **ComponentModel** it all covered by `dispatch` method, accessible within action.

```ts
{
    action() {
        // Send event to itself
        this.dispatch({ type: 'DO_THING' })

        // Send event to the parent.
        // Link to a parent is created automatically.
        this.parent.dispatch({ type: 'FROM_CHILD' })

        // Link to some other model.
        // A custom link you need to create by yourself
        this.someModel.dispatch({ type: 'PING' })
    }
}
```


## Data

**XState**

In Xstate data is called "context" and updated by `assign` action.

```ts
actions: assign({
    count: ({ event }) => event.value
})
```

**ComponentModel**

Data lives in a `data` property as SolidJS store and you mutate it directly via `this.setData` inside actions.

```ts
on: {
    SOME: {
        action(event) {
            this.setData('count', event.value);
        }
    }
}
```

You can also batch-set multiple keys with an object:

```ts
this.setData({ count: 1, name: 'x' });
```


## Transitions

### Basic target

```ts
on: {
    SOME_EVENT: {
        target: 'someState'
    }
}
```

### Re-entering the same state

Use `reenter: true` to force exit and entry actions even when the target is the current state.

```ts
on: {
    REFRESH: {
        target: 'default',
        reenter: true,
    }
}
```

### Eventless ("always") transitions

Declared at state-node level with `always`. Evaluated after every action and transition.

```ts
initial: {
    always: {
        target: 'first',
        guard() {
            return this.data.data !== undefined;
        }
    }
}
```

If the guard returns `false` the machine stays in the current state.

## Actions

In XState, actions are defined in the `setup` block and referenced by name in transitions. In `ComponentModel`, actions are regular methods on the class or inline function handlers bound to the model instance.

**XState**

```ts
import { setup, createActor, assign } from 'xstate';

const machine = setup({
  types: {
    context: {} as { count: number; message: string },
    events: {} as { type: 'INCREMENT' } | { type: 'DECREMENT' },
  },
  actions: {
    increment: assign({
      count: ({ context }) => context.count + 1,
    }),
    decrement: assign({
      count: ({ context }) => context.count - 1,
    }),
    log: ({ context }) => {
      console.log('Current count:', context.count);
    },
  },
}).createMachine({
  context: { count: 0, message: '' },
  initial: 'idle',
  states: {
    idle: {
      on: {
        INCREMENT: {
          target: 'idle',
          actions: ['increment', 'log'],
        },
        DECREMENT: {
          target: 'idle',
          actions: ['decrement', 'log'],
        },
      },
    },
  },
});
```

**ComponentModel**

```ts
import { ComponentModel, WithStateChart } from 'solid-component-model';

type Data = { count: number; message: string };
type Events = { type: 'INCREMENT' } | { type: 'DECREMENT' };

class CounterBase extends ComponentModel<Data, Events> {
  constructor() {
    super({ count: 0, message: '' });
  }

  protected increment() {
    this.setData('count', this.data.count + 1);
  }

  protected decrement() {
    this.setData('count', this.data.count - 1);
  }

  protected log() {
    console.log('Current count:', this.data.count);
  }
}

const Counter = WithStateChart(CounterBase, {
  initial: 'idle',
  states: {
    idle: {
      on: {
        INCREMENT: {
          target: 'idle',
          action() {
            this.increment();
            this.log();
          },
        },
        DECREMENT: {
          target: 'idle',
          action() {
            this.decrement();
            this.log();
          },
        },
      },
    },
  },
});
```

## Guards

Guards are plain method functions on the state-node handler. They receive the triggering event as an argument and are executed with the model as `this`.

```ts
on: {
    SOME: [{
        guard(event) {
            // Receives the triggering event
            console.log(event.value);
            // Has access to this as well, e.g. can read this.data
            return event.value !== this.data.some;
        },
        target: 'default',
        action(event) {
            this.setData({ some: event.value });
        }
    }]
}
```

If an array of handlers is provided, they are evaluated in order and the first one whose guard returns `true` (or has no guard) wins:

```ts
on: {
    SOME: [{
        guard(event) { ...},
        action(event) { ... }
    }, {
        guard(event) { ...},
        action(event) { ... }
    }, {
        action(event) { ... }
    }]
}
```


## Entry / exit actions

`entry` and `exit` are declared directly on the state node.

```ts
states: {
    loading: {
        entry() {
            this.setData('entry', this.data.entry + 1);
        },
        exit() {
            this.metaExitTriggered = true;
        },
        on: {
            DONE: { target: 'default' }
        }
    }
}
```

Exit actions run just before the state is left, entry actions run when the state is entered. They follow the same method-function rule as all other handlers. If an entry or exit action throws, the error is logged but the machine **continues** running and the transition still completes.


## Invoke

**XState** forces every side effect into an actor:

```ts
actors: {
    fetchUser: fromPromise(async ({ input }: { input: { userId: string } }) => {
      const user = await fetchUser(input.userId);
      return user;
    }),
  },

// And then somewhere in state

loading: {
    invoke: {
    id: 'getUser',
    src: 'fetchUser',
    input: ({ context: { userId } }) => ({ userId }),
    onDone: {
        target: 'success',
        actions: assign({ user: ({ event }) => event.output }),
    },
    onError: {
        target: 'failure',
        actions: assign({ error: ({ event }) => event.error }),
    },
    },
},
```

**ComponentModel**

This library has a simpler, imperative approach: you invoke a **promise** or an **observable** directly inside `entry` (or any other action) and attach `onDone` / `onError` handlers.

### Invoking a promise

```ts
loading: {
    entry() {
        this.invokePromise(
            (signal) => fetchUser(this.data.userId, signal);
            {
                onDone: {
                    action: (event) => this.setData('user', event.result),
                    target: 'success',
                },
                onError: {
                    action: (event) => this.setData('error', event.error),
                    target: 'failure',
                },
            }
        )
    }
}
```

### Invoking an observable

```ts
entry() {
    this.invokeObservable(someObservable, {
        next: {
            action: (event) => this.setData('counter', event.value)
        },
        error: {
            action: () => this.observableErrorHandled = true
        },
        complete: {
            action: () => { /* ... */ }
        }
    })
}
```

### Lifecycle of an invocation

Invoked objects are bound to the **state** that created them. When the machine exits that state, the invocation is automatically aborted (for promises) or unsubscribed (for observables). If the same parent state stays active while a child state changes, the parent's invocation stays alive.

### Guarded invoke handlers

`onDone` supports an array of handlers with guards, same as regular transitions:

```ts
onDone: [{
    guard: () => true,
    target: 'default',
    action: (event) => {
        this.setData('data', event.result);
    }
}, {
    target: 'default'
}]
```

An unhandled promise rejection or observable error moves the model to `error` status and emits the error through the observable error channel.


## Delayed transitions

**Xstate**

```ts
const pushTheButtonGame = createMachine({
  initial: 'waitingForButtonPush',
  states: {
    waitingForButtonPush: {
      after: {
        5000: {
          target: 'timedOut',
          actions: 'logThatYouGotTimedOut',
        },
      },
      success: {},
      timedOut: {},
    }
  },
});
```

**ComponentModel**

In `ComponentModel` there is no `after` property on state nodes. Instead you use `this.schedule(handler, delay)`.

```ts
entry() {
    this.schedule({
        target: 'default',
        action: () => this.setData('delayedFired', true)
    }, 50);

    this.schedule({
        action: () => this.setData('secondScheduleFired', true)
    }, 60);
}
```

Scheduled actions are bound to the state in which they were created. When the state is exited, all its **scheduled timers are automatically cancelled**. Stopping the model also cancels every pending schedule.

You can also schedule without a transition from a model's method:

```ts
eventThatSchedules(value: string) {
    this.schedule({
        action: () => this.setData('some', value)
    }, 10);
}
```


## Spawn

Both libraries provide a way to create child models and attach them to the parent.

**Xstate**:

```ts
createMachine({
  entry: [
    spawnChild(childMachine, { id: 'child-1' }),
    spawnChild(childMachine, { id: 'child-2' }),
    spawnChild(childMachine, { id: 'child-3' }),
  ],
});

// or

const parentMachine = createMachine({
  entry: [
    assign({
      childMachineRef: ({ spawn }) => spawn(childMachine, { id: 'child' }),
    }),
  ],
});
```

**ComponentModel**:

Instead of using `spawn` or `spawnChild` you just call `start` method in the context of an parent model's action and started model automatically bounds to the parent.

```ts
class ParentModel extends ComponentModel<ParentData, ParentEvents> {

    protected addChild() {
        const child = new ChildModel();
        child.start(); // attaches to a ParentModel as child
        this.data.children.push(child); // optional
    }
}
```

See [Spawning child models](./spawn-children.html#spawning-child-models) for full details

## Persistence

You can store the state of an actor/model in persistent storage, such as localStorage or a database, and restore the state of the model from that snapshot.

It's useful for maintaining state across browser reloads. 

### Snapshots & serialization

**Xstate**
```ts
const persistedState = actor.getPersistedSnapshot();
```


**ComponentModel**

```ts

const persistedState = model.getPersistedSnapshot();
```

<!-- ```ts
{
    _id: string;
    state: string;
    data: MyModelData;
    status: 'idle' | 'active' | 'stopped' | 'error' | 'done';
}
``` -->

### Restoring the state

**Xstate**
```ts
const restoredState = JSON.parse(localStorage.getItem('feedback'));

const restoredActor = createActor(actorMachine, {
  snapshot: restoredState,
}).start();
```

**ComponentModel**

```ts
const restoredModel = ModelWithoutStateChart.fromPersistedSnapshot(snapshot);
restoredModel.start();
```

### Restoring with child models

Child models are recursively serialized and restored. But both libraries required declaring childs in the setup. In case of `ComponentModel`, it's a static field inside your model class:

```ts
class ParentModel extends ComponentModel<ParentData, ParentEvents> {
    static childTypes = {
        Child: ChildModel
    }
}
```
See [Caching and Restoring Snapshots](./caching) for full details.


## Error handling

See [Errors handling](./errors-handling.md) for a full breakdown of how errors in guards, effects, and invoked objects behave, and which ones stop the model.


## Features not supported

The following XState features have no equivalent in ComponentModel:

* **State machines as actors / `invoke: machine`** — you cannot invoke another machine as a service; use model composition or child models instead.
* **`onDone` on a state machine invoke** — only `invokePromise` and `invokeObservable` exist.
* **Parallel states** — only hierarchical (nested) states are supported.
* **History states (`history`)** — not implemented.
* **Final states & output (`type: 'final'`, `output`)** — `status: 'done'` exists but there is no state-node-level final state concept.
* **Interpreter options (`devtools`, `clock`, etc.)** — there is a pluggable `logger` and `tracer`, but no full interpreter options API.
* **Routes** — for navigating deeply nested state from anywhere.
* **Pure transition functions** — allow you to compute the next state and actions of a state machine without creating a live actor or executing any side effects.
* **Tags**





<!--
Xstate features that guide needs to cover:

- [x] State machines
- [x] Setup
- [x] States
- [x] Context
- [x] Input
- [x] Output
- [x] Events and transitions
- [x] Routes
- [x] Pure transition functions
- [x] Eventless transitions
- [x] Delayed transitions
- [x] Actions
- [x] Guards
- [x] Initial states
- [x] Finite states
- [x] Parent states
- [x] Parallel states
- [x] Final states
- [x] History states
- [ ] Persistence
- [x] Tags
- [x] Event emitter
-->
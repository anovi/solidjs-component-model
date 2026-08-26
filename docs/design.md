# Design

Roles and responsibilities in a runtime model:

| Responsibility               | Role        | Comment                               |
| ---------------------------- | ----------- | ------------------------------------- |
| Manage lifecycle             | Context     |                                       |
| Manage scheduled             | Context     |                                       |
| Manage invoked               | Context     |                                       |
| Own a data                   | Context     |                                       |
| Own a state                  | Context     |                                       |
| Own a status                 | Context     |                                       |
| Manage children              | Context     |                                       |
| Manage external subscribers  | Context     |                                       |
| Execute transitions          | Context     |                                       |
| Execute effects              | Context     |                                       |
| Handle events                | Context     |                                       |
| Emit events                  | Context     |                                       |
| Own custom effects:          |             | setData, invoke, emit, schedule, etc. |
| ↳                            | Context     | custom methods of context             |
| ↳                            | StateChart  | effects in a chart                    |
| Store chart config           | StateChart  |                                       |
| Reslove a transition         | Interpreter |                                       |
| Execute guards               | Interpreter | To resolve a transition               |
| Generate transition steps    | Interpreter |                                       |
| Schedule tasks               | Scheduler   |                                       |
| Own custom methods and props | Interface   | E.g. non-reactive data.               |
| Provide API for a consumer   | Interface   |                                       |

`Interface` — a developer defined interface.

`Context` — an executional context against which effects and guards of a state chart run.

`Interpreter` — runtime interpreter of a state chart.

Developer should be able to define:

- Effects that only accessible within the model context and in a state chart.
- Public methods to provide API for a model.

Currently `ComponentModel` class fulfills the "Context" and the "Interface" roles. Because of that, it exposes methods that are not supposed to be in the interface. Exteranl code should not be able to directly call `schedule`, `enqueue`, or run effects that are tied to transitions.

In TypeScript it avoided by this:

- Adding `protected` keyword for sub-classes API, like `schedule`, `enqueue`, and others. External code can't call it, but it's only on TS level error.
- Adding `protected` keyword for custom effects that should only be accessible withing the context.

For vanilla JavaScript it does not work. External code can easily break incapsulation:

```js
// Just execute an effect
model.schedule({
  after: 10
  action: () => {
    console.log("Scheduled!");
  },
});

// Set data and break incapsulation!
model.setData('some', 'violation');
```

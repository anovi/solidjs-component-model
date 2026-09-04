import { WithStateChart, ComponentModel } from "../../src";
import { fetchData, someObservableCounter } from "./invokables";

type MyModelData = {
  some: string;
  entry: number;
  data: string | undefined;
};

type Events = { type: "LOAD" };

type Emits = { type: "SOME_HAPPEND" };

class ModelWithErrorsBase extends ComponentModel<MyModelData, Events, Emits> {
  observableErrorHandled = false;

  constructor() {
    super({
      some: "info",
      entry: 0,
      data: undefined,
    });
  }
}

export const MachineWithoutInitial = () =>
  WithStateChart(ModelWithErrorsBase, {
    states: {
      some: {},
      other: {},
    },
  });

export const MachineWithWrongInitial = () =>
  WithStateChart(ModelWithErrorsBase, {
    initial: "default",
    states: {
      some: {},
      other: {},
    },
  });

export const MachineWithWrongEventTarget = () =>
  WithStateChart(ModelWithErrorsBase, {
    initial: "default",
    states: {
      default: {
        on: {
          LOAD: {
            target: "loadingsss",
          },
        },
      },
      loading: {
        entry() {
          this.invokePromise(fetchData, {
            onDone: {
              target: "some",
            },
          });
        },
      },
    },
  });

export const MachineWithWrongTargetInPromiseDone = () =>
  WithStateChart(ModelWithErrorsBase, {
    initial: "default",
    states: {
      default: {
        on: {
          LOAD: {
            target: "loading",
          },
        },
      },
      loading: {
        entry() {
          this.invokePromise(fetchData, {
            onDone: {
              target: "some",
            },
            onError: {
              action: e => {
                // What to do?
                void e;
              },
            },
          });
        },
      },
    },
  });

export const MachineWithWrongTargetInObservableNext = () =>
  WithStateChart(ModelWithErrorsBase, {
    initial: "default",
    states: {
      default: {
        on: {
          LOAD: {
            target: "loading",
          },
        },
      },
      loading: {
        invoke: {
          observable() {
            return someObservableCounter;
          },
          next: {
            target: "some",
          },
        },
      },
    },
  });

export const MachineWithWrongTargetInAlways = () =>
  WithStateChart(ModelWithErrorsBase, {
    initial: "default",
    states: {
      default: {
        on: {
          LOAD: {
            target: "loading",
          },
        },
      },
      loading: {
        always: {
          action() {
            this.invokePromise(fetchData, {
              onDone: {
                target: "some",
              },
            });
          },
        },
      },
    },
  });

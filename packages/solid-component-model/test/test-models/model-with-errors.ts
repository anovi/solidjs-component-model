import { ComponentModel, type StateChartConfig } from "../../src";
import {
  fetchData,
  observableThatThrows,
  rejectedFetchData,
} from "./invokables";
import { WithStateChart } from "../../src/create-chart";

type MyModelData = {
  some: string;
  entry: number;
  data: string | undefined;
};

type Events =
  | { type: "SOME"; value: string }
  | { type: "OTHER"; value: string }
  | { type: "LOAD_RISKY_ENDPOINT" }
  | { type: "LOAD_UNHANDLED_RISKY_ENDPOINT" }
  | { type: "TO_OBSERVABLE" }
  | { type: "TO_OBSERVABLE_UNHANDLED" }
  | { type: "BREAK_LOADING" }
  | { type: "TO_BROKEN_GUARD" }
  | { type: "TO_ENTRY_THROW" }
  | { type: "TO_EXIT_THROW" }
  | { type: "TO_DEFAULT" };

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

const config = {
  initial: "initial",
  on: {
    TO_ENTRY_THROW: { target: "stateWithEntryThrow" },
    TO_EXIT_THROW: { target: "stateWithExitThrow" },
    TO_DEFAULT: { target: "default" },
    TO_BROKEN_GUARD: { target: "withBrokenGuard" },
  },
  states: {
    initial: {
      always: {
        target: "default",
      },
    },
    default: {
      entry() {},
      on: {
        SOME: {
          action(event) {
            this.setData({
              some: event.value,
            });
            throw Error(`Error in SOME handler of "default"`);
          },
          target: "loading",
        },
        TO_OBSERVABLE: {
          target: "observation",
        },
        TO_OBSERVABLE_UNHANDLED: {
          target: "observationUnhandled",
        },
        LOAD_RISKY_ENDPOINT: {
          target: "loadingThatWillReject",
        },
        LOAD_UNHANDLED_RISKY_ENDPOINT: {
          target: "loadingThatWillRejectUnhandled",
        },
      },
    },
    stateWithEntryThrow: {
      entry() {
        throw Error("in entry effect");
      },
    },
    stateWithExitThrow: {
      exit() {
        throw Error("in exit effect");
      },
    },
    loading: {
      entry() {
        this.setData("entry", this.data.entry + 1);
        this.invokePromise(fetchData, {
          onDone: {
            action: event => {
              this.setData("data", event.result);
            },
            target: "default",
          },
          onError: { action: () => this.dispatch({ type: "BREAK_LOADING" }) },
        });
      },
      on: {
        OTHER: {
          target: "default",
          action(event) {
            this.setData({ some: event.value });
            this.emit({ type: "SOME_HAPPEND" });
          },
        },
        BREAK_LOADING: {
          target: "default",
        },
      },
    },
    loadingThatWillReject: {
      entry() {
        this.invokePromise(rejectedFetchData, {
          onDone: {
            target: "default",
            action: ev => {
              this.setData("data", ev.result);
            },
          },
          onError: {
            target: "default",
            action: () => {
              this.setData("some", "terrible breakdown");
            },
          },
        });
      },
    },
    loadingThatWillRejectUnhandled: {
      entry() {
        this.invokePromise(rejectedFetchData, {
          onDone: {
            target: "default",
            action: ev => {
              this.setData("data", ev.result);
            },
          },
        });
      },
    },

    withBrokenGuard: {
      on: {
        SOME: [
          {
            guard() {
              throw Error("broken guard");
              return true;
            },
            target: "default",
          },
        ],
      },
    },

    observation: {
      invoke: {
        observable() {
          return observableThatThrows;
        },
        next: {
          action: () => {},
        },
        error: {
          action() {
            this.observableErrorHandled = true;
          },
        },
      },
    },
    observationUnhandled: {
      invoke: {
        observable() {
          return observableThatThrows;
        },
        next: {
          action: () => {},
        },
      },
    },
  },
} satisfies StateChartConfig<ModelWithErrorsBase, Events>;

// ModelWithErrors.config = config;

export const ModelWithErrors = WithStateChart(ModelWithErrorsBase, config);

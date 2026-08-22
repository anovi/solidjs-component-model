import { Observable } from "rxjs";
import { ComponentModel } from "../../src";
import { WithStateChart } from "../../src/create-chart";

type MyModelData = {
  some: string;
  entry: number;
  data: string | undefined;
};

type Events =
  | { type: "SOME"; value: string }
  | { type: "OTHER"; value: string }
  | { type: "LOAD_RISKY_ENDPOINT"; value: string }
  | { type: "LOAD_WITH_GENERAL_INVOKE" }
  | { type: "TO_OBSERVABLE" }
  | { type: "BREAK_LOADING" };

type Emits = { type: "SOME_HAPPEND" };

class ModelWithStateNodesBase extends ComponentModel<
  MyModelData,
  Events,
  Emits
> {
  constructor() {
    super({
      some: "info",
      entry: 0,
      data: undefined,
    });
  }
}

export const ModelWithStateNodes = WithStateChart(ModelWithStateNodesBase, {
  initial: "initial",
  states: {
    initial: {
      always: {
        target: "default",
      },
    },
    default: {
      on: {
        SOME: {
          target: "loading",
          action(event) {
            this.setData({
              some: event.value,
            });
          },
        },
        TO_OBSERVABLE: {
          target: "observation",
        },
        LOAD_RISKY_ENDPOINT: {
          target: "loadingThatWillReject",
        },
        // LOAD_WITH_GENERAL_INVOKE: {
        //     target: 'loadingWithGeneralInvoke'
        // }
      },
    },
    loading: {
      entry() {
        this.setData("entry", this.data.entry + 1);
        this.invokePromise(fetchData, {
          onDone: [
            {
              target: "default",
              guard: () => true,
              action: event => {
                this.setData("data", event.result);
              },
            },
            {
              target: "default",
            },
          ],
          onError: {
            action: () => this.dispatch({ type: "BREAK_LOADING" }),
          },
        });
      },
      on: {
        OTHER: [
          {
            target: "default",
            guard(event) {
              return !!event.value;
            },
            action(event) {
              this.setData({ some: event.value });
              this.emit({ type: "SOME_HAPPEND" });
            },
          },
        ],
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
            action: event => {
              this.setData("data", event.result);
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
    // loadingWithGeneralInvoke: {
    //     entry() {
    //         this.invoke(async (ctx) => {
    //             try {
    //                 await fetchData(ctx.signal);
    //                 this.enqueue(() => this.goto<State>('default'));
    //                 this.enqueue(() => this.setData('some', 'custom invoked ok'));
    //             } catch (error) {
    //                 this.enqueue(() => undefined);
    //                 this.enqueue(() => this.goto<State>('default'));
    //             }
    //         })
    //     }
    // },

    observation: {
      entry() {
        this.invokeObservable(someObservable, {
          next: {
            action: ev => {
              this.setData({ some: String(ev.value) });
            },
          },
        });
      },
      on: {
        SOME: { target: "default" },
        OTHER: { target: "default" },
      },
    },
  },
});

const someObservable = new Observable<number>(sub => {
  let num = 0;
  const id = setInterval(() => {
    sub.next(num++);
  }, 100);
  return () => clearInterval(id);
});

function fetchData(signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => resolve("some data"), 80);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject();
    });
  });
}

function rejectedFetchData(signal: AbortSignal): Promise<string> {
  return new Promise((_resolve, reject) => {
    const id = setTimeout(() => reject(new Error("Something went wrong")), 80);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      reject();
    });
  });
}

import { ComponentModel, WithStateChart } from "../../src";

type Data = {
  log: string[];
};

type Events =
  | { type: "GO" }
  | { type: "GO_DEEPER" }
  | { type: "SCHEDULE_TEST" }
  | { type: "ENQUEUE_TEST" };

class ModelBase extends ComponentModel<Data, Events> {
  constructor() {
    super({
      log: [],
    });
  }

  record(label: string) {
    this.setData("log", this.data.log.length, label);
  }
}

export const ModelWithEffectOrder = WithStateChart(ModelBase, {
  initial: "idle",
  always: {
    action() {
      this.record("always-action-top");
    },
  },
  states: {
    idle: {
      // always: eventless (executes after entry of idle, on transition into idle)
      always: {
        target: "first",
        guard() {
          // This guard runs during start, returns true so always transition fires
          return this.data.log.length < 5;
        },
        action() {
          this.record("always-action");
        },
      },
      entry() {
        this.record("idle-entry");
      },
      exit() {
        this.record("idle-exit");
      },
      on: {
        GO: {
          target: "withSchedule",
          action() {
            this.record("event-action-on-GO");
            this.enqueue(() => {
              this.record("queued-action-from-GO");
            });
          },
        },
        SCHEDULE_TEST: {
          target: "withSchedule",
          action() {
            this.schedule({
              after: 5,
              action: () => {
                this.record("scheduled-action-in-event");
              },
            });
          },
        },
      },
    },
    first: {
      entry() {
        this.record("first-entry");
        this.enqueue(() => {
          this.record("queued-action-in-first-entry");
        });
      },
      exit() {
        this.record("first-exit");
      },
      on: {
        GO: {
          target: "second",
          action() {
            this.record("event-action-in-first");
            this.enqueue(() => {
              this.record("queued-action-in-first-event");
            });
          },
        },
      },
    },
    second: {
      initial: "child",
      entry() {
        this.record("second-entry");
      },
      exit() {
        this.record("second-exit");
      },
      states: {
        child: {
          entry() {
            this.record("second.child-entry");
          },
          exit() {
            this.record("second.child-exit");
            this.enqueue(() => {
              this.record("queued-action-in-child-exit");
            });
          },
          on: {
            GO_DEEPER: {
              target: "second.deeper",
              action() {
                this.record("event-action-in-child");
                // Enqueue 5 actions
                for (let index = 0; index < 5; index++) {
                  this.enqueue(() => {
                    this.record(`queued-action-in-child-event-${index}`);
                  });
                }
              },
            },
          },
          always: {
            action() {
              this.record("always-action-in-child");
            },
          },
        },
        deeper: {
          after: {
            // Test of declarative scheduling
            5: {
              action() {
                this.record("scheduled-action-in-deeper");
              },
            },
          },
          entry() {
            this.record("second.deeper-entry");
          },
          on: {
            GO: {
              target: "idle",
              action() {
                this.record("event-action-in-deeper");
              },
            },
          },
        },
        other: {},
      },
      on: {
        ENQUEUE_TEST: {
          action() {
            this.enqueue(() => {
              this.record("queued-action-from-second");
            });
          },
        },
      },
    },
    withSchedule: {
      entry() {
        this.record("withSchedule-entry");
        this.schedule({
          after: 5,
          action: () => {
            this.record("scheduled-action-in-withSchedule");
          },
        });
      },
      on: {
        GO: {
          target: "idle",
          action() {
            this.record("event-action-in-withSchedule");
          },
        },
      },
    },
  },
});

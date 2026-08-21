import { it, describe, assert } from "vitest";

import { ModelWithDelayedTransitions } from "./test-models/test-model";
import {
  expectUncaughtException,
  expectUnhandledRejection,
  sleep,
} from "./test-kit";
import { ModelWithStateNodes } from "./test-models/model-with-state-nodes";
import { ParentModel } from "./test-models/parent-model";
import { ModelWithChildStateNodes } from "./test-models/model-with-hierarchy";
import { ModelWithConfig } from "./test-models/test-model-config";
import { ModelWithEntryTrans } from "./test-models/model-with-entry-transition";
import { ModelWithoutStateChart } from "./test-models/model-without-state-chart";
import { ModelWithErrors } from "./test-models/model-with-errors";
import {
  MachineWithoutInitial,
  MachineWithWrongInitial,
  MachineWithWrongTargetInObservableNext,
  MachineWithWrongTargetInPromiseDone,
  MachineWithWrongTargetInAlways,
  MachineWithWrongEventTarget,
} from "./test-models/malformed-machine";
import {
  WithStateChart,
  ComponentModel,
  TerminalLogger,
  MachineMalformed,
  StateChart,
  type ModelConstructor,
} from "../src";
import { ModelWithEffectOrder } from "./test-models/model-with-effect-order";
import { CustomizedParentModelMachine } from "./test-models/parent-with-custom-serialization";
import { ParentModelHiddenChildren } from "./test-models/parent-model-no-explicit-children";
import { ModelWithActionDecorator } from "./test-models/model-with-action-decorator";
void TerminalLogger;

ComponentModel.configure({
  logger: new TerminalLogger(),
});

describe("component-model", () => {
  describe("Model without State Chart", () => {
    it("receives event", async () => {
      const model = new ModelWithoutStateChart();
      model.start();
      model.someEvent("updated");
      await sleep(0);
      assert.equal(model.data.some, "updated");
    });

    it("handles multiple event", async () => {
      const model = new ModelWithoutStateChart();
      model.start();
      model.eventThatSchedules("scheduled update 1");
      model.eventThatSchedules("scheduled update 2");
      model.eventThatSchedules("scheduled update 3");
      await sleep(20);
      assert.equal(model.data.some, "scheduled update 3");
    });

    it("invokes and stops an observable", async () => {
      const model = new ModelWithoutStateChart();
      model.start();
      model.startInvokable();
      await sleep(105);
      assert.equal(model.data.counter, 1);
      await sleep(101);
      assert.equal(model.data.counter, 2);
      model.stop();
      await sleep(130);
      assert.equal(model.data.counter, 2);
      assert.equal(model.status, "stopped");
    });

    it("spawns and stops children", async () => {
      const model = new ModelWithoutStateChart();
      model.start();
      model.addChild();
      model.addChild();
      await sleep(0);
      assert.equal(model.data.children.length, 2);

      const child = model.data.children[0];
      model.stop();
      assert.equal(child.status, "stopped");
    });
  });

  describe("@action decorator", () => {
    it("enqueues decorated method as an effect", async () => {
      const model = new ModelWithActionDecorator();
      model.start();
      model.pushLog("first");
      // Before microtask runs, log should still be empty
      assert.equal(model.data.log.length, 0);
      await sleep(0);
      assert.equal(model.data.log.length, 1);
      assert.equal(model.data.log[0], "first");
    });

    it("enqueues an effecdt within an enqueued method", async () => {
      const model = new ModelWithActionDecorator();
      model.start();
      model.pushLogWithInternalEnqueue("first");
      // Before microtask runs, log should still be empty
      assert.equal(model.data.log.length, 0);
      await sleep(0);
      assert.equal(model.data.log.length, 1);
      assert.equal(model.data.log[0], "first");
    });

    it("preserves method arguments", async () => {
      const model = new ModelWithActionDecorator();
      model.start();
      model.pushLogMultiple("a", "b");
      await sleep(0);
      assert.deepEqual(model.data.log, ["a", "b"]);
    });

    it("does not affect non-decorated methods", () => {
      const model = new ModelWithActionDecorator();
      model.start();
      model.regularMethod("sync");
      assert.deepEqual(model.data.log, ["sync"]);
    });
  });

  describe("model with state nodes", () => {
    it("receives event", async () => {
      const model = new ModelWithStateNodes();
      model.start();
      assert.equal(model.state(), "default");
      model.send.SOME({ value: "one" });
      assert.equal(model.data.some, "one");
      assert.equal(model.state(), "loading");
      model.send.SOME({ value: "two" });
      assert.equal(model.data.some, "one", "Should not change");
      model.send.OTHER({ value: "three" });
      assert.equal(model.data.some, "three");
      assert.equal(model.state(), "default");
    });

    it("emits events", async () => {
      return new Promise<void>(done => {
        const model = new ModelWithStateNodes();
        model.start();
        model.send.SOME({ value: "one" });
        assert.equal(model.state(), "loading");

        model.on("SOME_HAPPEND", event => {
          assert.equal(event.type, "SOME_HAPPEND");
          done();
        });

        model.send.OTHER({ value: "three" });
      });
    });

    it("emits complete event", async () => {
      return new Promise<void>(done => {
        const model = new ModelWithStateNodes();
        model.start();

        model.subscribe({
          complete: () => {
            done();
          },
        });

        model.stop();
      });
    });

    it("handles entry event", async () => {
      const model = new ModelWithStateNodes();
      model.start();
      model.dispatch({ type: "SOME", value: "one" });
      assert.equal(model.state(), "loading");
      assert.equal(model.data.entry, 1);
    });
  });

  describe("model with children", () => {
    it("adds children", async () => {
      const parent = new ParentModel();
      parent.start();
      parent.addItem();
      assert.lengthOf(parent.data.children, 1);
      parent.addItem();
      parent.addItem();
      assert.lengthOf(parent.data.children, 3);
    });

    it("communicates between child and parent", async () => {
      const parent = new ParentModel();
      parent.start();
      parent.addItem();
      await sleep(12);
      assert.equal(parent.data.some, "from child");
    });

    it("it binds models started in an action to the owner of that action as their parent", async () => {
      const parent = new ParentModel();
      parent.start();
      parent.addItem();
      parent.addItem();
      parent.addItem();
      assert.lengthOf(parent.data.children, 3);
      parent.stop();
      assert.equal(parent.status, "stopped");
      assert.equal(parent.data.children[0].status, "stopped");
    });

    it("remove child when parent is without state chart", async () => {
      const parent = new ParentModel();
      parent.start();
      parent.addItem();
      parent.addItem();
      parent.addItem();
      assert.lengthOf(parent.data.children, 3);
      const modelToRemove = parent.data.children[1];
      parent.send.REMOVE({ id: modelToRemove._id });
      assert.lengthOf(parent.data.children, 2);
      assert.equal(modelToRemove.status, "stopped");
    });
  });

  describe("toJSON", () => {
    it("returns snapshot", async () => {
      const parent = new ParentModel();
      parent.start();
      parent.addItem();
      (assert.deepEqual(parent.toJSON(), {
        _id: parent._id,
        state: "default",
        status: "active",
        name: "",
        data: {
          counter: 0,
          some: "info",
          children: [
            {
              _id: parent.data.children[0]._id,
              state: "default",
              name: "Child",
              status: "active",
              data: { some: "info" },
            },
          ],
        },
      } as any),
        "shouldu correctly json child model");
    });
  });

  describe("invocations", () => {
    it("invokes a promise", async () => {
      const model = new ModelWithStateNodes();
      model.start();
      model.send.SOME({ value: "one" });
      assert.equal(model.state(), "loading");
      await sleep(90);
      assert.equal(model.data.data, "some data");
    });

    it("cancels an invoked promise", async () => {
      const model = new ModelWithStateNodes();
      model.start();
      model.send.SOME({ value: "one" });
      assert.equal(model.state(), "loading");
      model.send.BREAK_LOADING();
      await sleep(200);
      assert.equal(model.data.data, undefined);
    });

    it("invokes and stops an observable", async () => {
      const model = new ModelWithStateNodes();
      model.start();
      model.send.TO_OBSERVABLE();
      assert.equal(model.state(), "observation");
      await sleep(320);
      assert.equal(model.data.some, "2");
      model.send.SOME({ value: "observable breaked" });
      assert.equal(model.state(), "default");
      await sleep(110);
      assert.equal(model.data.some, "2");
    });

    it("handles actions of an invokable with state setter", async () => {
      const model = new ModelWithStateNodes();
      model.start();
      model.send.SOME({ value: "one" });
      await sleep(90);
      assert.equal(model.data.data, "some data");
    });

    it("handles onError action of an invoked promise, with goto", async () => {
      const model = new ModelWithStateNodes();
      model.start();
      model.send.LOAD_RISKY_ENDPOINT({ value: "one" });
      await sleep(90);
      assert.equal(model.data.some, "terrible breakdown");
      assert.equal(model.state(), "default");
    });

    it.skip("handles actions of an GENERIC invokable with state setter", async () => {
      const model = new ModelWithStateNodes();
      model.start();
      model.send.LOAD_WITH_GENERAL_INVOKE();
      assert.equal(model.state(), "loadingWithGeneralInvoke");
      await sleep(90);
      assert.equal(model.state(), "default");
      assert.equal(model.data.some, "custom invoked ok");
    });

    it("keeps invoked in top node alive", async () => {
      const model = new ModelWithChildStateNodes();
      model.start();
      await sleep(105);
      assert.ok(model.matches("default"));
      assert.equal(model.data.counter, 1);
      model.send.SOME({ value: "Go go" });
      assert.ok(model.matches("loading"));
      await sleep(205);
      assert.ok(model.matches("default"));
      assert.equal(model.data.counter, 3);
    });
  });

  describe("child state", () => {
    it("moves to child state", async () => {
      const model = new ModelWithChildStateNodes();
      model.start();
      assert.ok(
        model.defaultStateEntryHookTriggered,
        "should trigger entry hook of inital state"
      );
      model.send.SOME({ value: "start loading" });
      assert.equal(model.state(), "loading.meta");
      assert.ok(model.matches("loading"));
      await sleep(110);
      assert.equal(model.state(), "loading.content");
      await sleep(110);
      assert.equal(model.state(), "default");
      assert.ok(model.metaExitTriggered);
      assert.ok(model.contentExitTriggered);
    });
  });

  describe("test class with config", () => {
    it("dispatches an event and calls action", async () => {
      const model = new ModelWithConfig();
      model.start();
      model.send.SOME({ value: "sldkf" });
      assert.ok(model.effectFired);
    });
  });

  describe("transitions", () => {
    it("fires all entry/exit hanlders", async () => {
      const model = new ModelWithEntryTrans("some");
      model.start();
      assert.ok(model.matches("first.child"));
      assert.ok(model.initialExitFired);
      assert.ok(model.firstEntryFired);
      assert.ok(model.firstChildEntryFired);
      assert.ok(!model.firstChildExitFired);

      model.dispatch({ type: "SOME", value: "" });
      assert.ok(model.matches("second.child"));
      assert.ok(model.firstChildExitFired);
      assert.ok(model.secondEntryFired);
      assert.ok(model.secondChildEntryFired);
      assert.ok(!model.secondChildExitFired);
    });

    it("handles handler from parent state", async () => {
      const model = new ModelWithEntryTrans("some");
      model.start();
      assert.ok(model.matches("first.child"));

      model.dispatch({ type: "ULTIMATE" });
      assert.ok(model.matches("third"));
    });

    it("guarded transition fails when guard returns false", async () => {
      // @ts-ignore for the test we do not pass input data
      const model = new ModelWithEntryTrans();
      model.start();
      assert.ok(model.matches("initial"));
    });

    it("it fires ongoing queue first, befor it stops", async () => {
      const model = new ModelWithEntryTrans("some");
      model.start();
      assert.ok(model.matches("first.child"));
      model.dispatch({ type: "ULTIMATE" });
      assert.ok(model.matches("third"));
      model.on("WANT_TO_STOP", () => model.stop());
      model.dispatch({ type: "DO_SOME_STUFF" });
      assert.equal(model.data.data, "just before quit");
    });

    it("it reenters state", async () => {
      const model = new ModelWithEntryTrans("some");
      model.start();
      assert.ok(model.matches("first.child"));
      model.firstEntryFired = false;
      model.firstChildEntryFired = false;
      model.firstChildExitFired = false;
      model.dispatch({ type: "TRY_REENTER" });
      assert.ok(model.matches("first.child"));
      assert.ok(model.firstChildEntryFired);
      assert.ok(model.firstChildExitFired);
      assert.ok(!model.firstEntryFired, "Should not reenter parent state");
    });
  });

  describe("delayed events", () => {
    it("schedules event with simple method", async () => {
      const model = new ModelWithDelayedTransitions();
      model.start();
      model.eventThatSchedules("scheduled update");
      await sleep(20);
      assert.equal(model.data.some, "scheduled update");
      model.stop();
    });

    it("delay transition", async () => {
      const model = new ModelWithDelayedTransitions();
      model.start();
      model.dispatch({ type: "some" });
      assert.ok(model.matches("Second"));
      await sleep(51);
      assert.ok(model.matches("Default"));
      assert.equal(model.data.delayedFired, true);
      model.stop();
    });

    it("prevent schedules on state change", async () => {
      const model = new ModelWithDelayedTransitions();
      model.start();
      model.dispatch({ type: "some" });
      assert.ok(model.matches("Second"));
      await sleep(30);
      model.dispatch({ type: "prevent" });
      assert.ok(model.matches("Default"));
      assert.equal(model.data.delayedFired, false);
      model.stop();
    });

    it("cancels all scheduled actions of the exited state, not just the transition one", async () => {
      const model = new ModelWithDelayedTransitions();
      model.start();
      model.dispatch({ type: "some" });
      assert.ok(model.matches("Second"));
      await sleep(30);
      model.dispatch({ type: "prevent" });
      assert.ok(model.matches("Default"));
      await sleep(60);
      assert.equal(model.data.delayedFired, false);
      assert.equal(
        model.data.secondScheduleFired,
        false,
        "second schedule should be cancelled on exit too"
      );
      model.stop();
    });

    it("does not cancel scheduled actions of a sibling state", async () => {
      const model = new ModelWithDelayedTransitions();
      model.start();
      model.dispatch({ type: "some" });
      assert.ok(model.matches("Second"));
      model.dispatch({ type: "toThird" });
      assert.ok(model.matches("Third"));
      await sleep(60);
      assert.equal(
        model.data.delayedFired,
        false,
        "schedules of exited Second state should be cancelled"
      );
      assert.equal(
        model.data.secondScheduleFired,
        false,
        "schedules of exited Second state should be cancelled"
      );
      assert.equal(
        model.data.thirdEntryScheduleFired,
        true,
        "schedule of the current Third state should still fire"
      );
      model.stop();
    });

    it("cancels scheduled actions when the model is stopped", async () => {
      const model = new ModelWithDelayedTransitions();
      model.start();
      model.dispatch({ type: "some" });
      assert.ok(model.matches("Second"));
      model.stop();
      await sleep(60);
      assert.equal(model.data.delayedFired, false);
      assert.equal(model.data.secondScheduleFired, false);
    });
  });

  describe("errors", () => {
    describe("in event Effects", () => {
      it("error in event handler Effect — continues", async () => {
        const model = new ModelWithErrors();
        model.start();
        assert.equal(model.state(), "default");
        model.dispatch({ type: "SOME", value: "" });
        assert.ok(model.matches("loading"));
        await sleep(100);
        assert.ok(model.matches("default"));
        assert.equal(model.status, "active");
      });
    });

    describe("in transition Effects", () => {
      it("error in entry effect — continues", async () => {
        const model = new ModelWithErrors();
        model.start();
        model.dispatch({ type: "TO_ENTRY_THROW" });
        assert.ok(model.matches("stateWithEntryThrow"));
        assert.equal(model.status, "active");
      });
      it("error in exit effect — continues", async () => {
        const model = new ModelWithErrors();
        model.start();
        model.dispatch({ type: "TO_EXIT_THROW" });
        assert.ok(model.matches("stateWithExitThrow"));
        model.dispatch({ type: "TO_DEFAULT" });
        assert.ok(model.matches("default"));
        assert.equal(model.status, "active");
      });
    });

    describe("in transition resolution", () => {
      it("error in guard — breaks", async () => {
        return new Promise<void>(done => {
          const model = new ModelWithErrors();
          model.start();
          assert.equal(model.state(), "default");
          model.dispatch({ type: "TO_BROKEN_GUARD" });
          assert.ok(model.matches("withBrokenGuard"));
          model.subscribe({
            error: err => {
              assert.ok(err);
              assert.ok(err instanceof Error);
              assert.ok(model.matches("withBrokenGuard"));
              assert.equal(model.status, "error");
              assert.ok(model.error instanceof MachineMalformed);
              done();
            },
          });
          model.dispatch({ type: "SOME", value: "" });
        });
      });
    });

    describe("in invoked Promise", () => {
      it("with error handler — continues", async () => {
        const model = new ModelWithErrors();
        model.start();
        assert.equal(model.state(), "default");
        model.dispatch({ type: "LOAD_RISKY_ENDPOINT" });

        await sleep(100);

        assert.equal(model.data.some, "terrible breakdown");
        assert.ok(model.matches("default"));
      });
      it("without error handler — breaks", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let model: any = undefined;
        const error = await expectUnhandledRejection(async () => {
          model = new ModelWithErrors();
          model.start();
          assert.equal(model.state(), "default");
          model.dispatch({ type: "LOAD_UNHANDLED_RISKY_ENDPOINT" });

          await sleep(100);

          assert.equal(model.status, "error");
        });

        assert.ok(error instanceof MachineMalformed);
        assert.equal(model.status, "error");
      });
    });

    describe("in invoked Observable", () => {
      it("with error handler — continues", async () => {
        const model = new ModelWithErrors();
        model.start();
        assert.equal(model.state(), "default");
        model.dispatch({ type: "TO_OBSERVABLE" });
        assert.ok(model.matches("observation"));

        await sleep(12);

        assert.equal(model.observableErrorHandled, true);
      });
      it("without error handler — breaks", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let model: any = undefined;
        const error = await expectUncaughtException(async () => {
          model = new ModelWithErrors();
          model.start();
          assert.equal(model.state(), "default");
          model.dispatch({ type: "TO_OBSERVABLE_UNHANDLED" });
          assert.ok(model.matches("observationUnhandled"));

          await sleep(12);

          // assert.equal(model.status, 'error');
        });

        // catch (error) {

        assert.ok(error instanceof MachineMalformed);
        assert.equal(model.status, "error");
      });
    });
  });

  describe("malformed", () => {
    // These throws at the setup time
    // when creating a machine constructor with `WithStateChart`
    it("missing initial state", () => {
      assert.throws(() => {
        MachineWithoutInitial();
      }, MachineMalformed);
    });
    it("wrong initial state", () => {
      assert.throws(() => {
        MachineWithWrongInitial();
      }, MachineMalformed);
    });
    it("wrong target in on handler", () => {
      assert.throws(() => {
        const Machine = MachineWithWrongEventTarget();
        const model = new Machine();
        model.start();
        model.dispatch({ type: "LOAD" });
      }, MachineMalformed);
    });

    // These throws happen in runtime and causes machine
    // to switch to `error` status. It throws as well.
    it("throws at wrong target in Pormise onDone invoked in always handler", async () => {
      const error = await expectUnhandledRejection(async () => {
        const Machine = MachineWithWrongTargetInAlways();
        const model = new Machine();
        model.start();
        model.dispatch({ type: "LOAD" });
        await sleep(120);
        assert.ok(model.status === "error");
      });
      assert.ok(error instanceof MachineMalformed);
    });

    it("throws at wrong target in observable next handler", async () => {
      const error = await expectUncaughtException(async () => {
        const Machine = MachineWithWrongTargetInObservableNext();
        const model = new Machine();
        model.start();
        model.dispatch({ type: "LOAD" });
        await sleep(110);
        assert.ok(model.status === "error");
      });
      assert.ok(error instanceof MachineMalformed);
    });

    it("throws at wrong target in Promise onDone handler", async () => {
      const error = await expectUnhandledRejection(async () => {
        const Machine = MachineWithWrongTargetInPromiseDone();
        const model = new Machine();
        model.start();
        model.dispatch({ type: "LOAD" });
        await sleep(110);
        assert.ok(model.status === "error");
      });
      assert.ok(error instanceof MachineMalformed);
    });

    it("wrong target in nested state handler", () => {
      // do later
    });
  });

  describe("composition", () => {
    it("can have one model with two statecharts", async () => {
      class Model extends ComponentModel {
        some = "";

        someMethodA() {
          this.some = "someMethodA called";
        }

        someMethodB() {
          this.some = "someMethodB called";
        }
      }

      const ModelWithChartA = WithStateChart(Model, {
        initial: "default",
        states: {
          default: {
            always: { target: "other" },
          },
          other: {
            entry() {
              this.someMethodA();
            },
          },
        },
      });

      const ModelWithChartB = WithStateChart(Model, {
        initial: "default",
        states: {
          default: {
            always: { target: "other" },
          },
          other: {
            entry() {
              this.someMethodB();
            },
          },
        },
      });

      const instA = new ModelWithChartA({});
      const instB = new ModelWithChartB({});
      instA.start();
      instB.start();

      assert.equal(instA.some, "someMethodA called");
      assert.equal(instB.some, "someMethodB called");
    });

    it("attaches compiled chart to a model", async () => {
      type events = { type: "EVENT" };
      let called = false;
      class Model extends ComponentModel<any, events> {
        constructor() {
          super({});
        }
        someMethod() {
          called = true;
        }
      }

      const compiledChart = StateChart.create<Model, events>({
        initial: "default",
        states: {
          default: {
            on: {
              EVENT: {
                action() {
                  this.someMethod();
                },
              },
            },
          },
          some: {},
        },
      });

      const ModelWithCompiledChart = WithStateChart(Model, compiledChart);
      const inst = new ModelWithCompiledChart();
      inst.start();
      inst.dispatch({ type: "EVENT" });
      assert.equal(called, true);
    });

    it("attaches a compiled chart to different models with the same interface", async () => {
      type events = { type: "EVENT" };

      interface Model {
        someMethod: () => void;
      }

      let called1 = false;
      let called2 = false;

      class MyModel extends ComponentModel<any, events> implements Model {
        constructor() {
          super({});
        }
        someMethod() {
          called1 = true;
        }
      }
      class MyModel2 extends ComponentModel<any, events> implements Model {
        constructor() {
          super({});
        }
        someMethod() {
          called2 = true;
        }
      }

      const compiledChart = StateChart.create<Model, events>({
        initial: "default",
        states: {
          default: {
            on: {
              EVENT: {
                action() {
                  this.someMethod();
                },
              },
            },
          },
          some: {},
        },
      });

      const ModelWithCompiledChart1 = WithStateChart<ModelConstructor<MyModel>>(
        MyModel,
        compiledChart
      );
      const ModelWithCompiledChart2 = WithStateChart<ModelConstructor<MyModel>>(
        MyModel2,
        compiledChart
      );

      const inst1 = new ModelWithCompiledChart1();
      inst1.start();
      inst1.dispatch({ type: "EVENT" });
      assert.equal(called1, true);

      const inst2 = new ModelWithCompiledChart2();
      inst2.start();
      inst2.dispatch({ type: "EVENT" });
      assert.equal(called2, true);
    });
  });

  describe("ordering", () => {
    it("orders effects", async () => {
      const model = new ModelWithEffectOrder();
      model.start();
      model.dispatch({ type: "GO" });
      model.dispatch({ type: "GO_DEEPER" });
      await sleep(5);
      model.dispatch({ type: "GO" });
      model.dispatch({ type: "SCHEDULE_TEST" });
      await sleep(5);
      model.dispatch({ type: "GO" });
      await sleep(5);

      const data = model.data.log;

      assert.deepEqual(data, [
        // State: idle
        "idle-entry",
        "always-action",
        "idle-exit",
        // State: first
        "first-entry",
        "queued-action-in-first-entry",
        "always-action-top",
        // Event: 'GO'
        "event-action-in-first",
        "queued-action-in-first-event",
        "first-exit",
        // State: second
        "second-entry",
        // State: second.child
        "second.child-entry",
        "always-action-in-child", // it prevents 'always-action-top' to run
        // Event: 'GO_DEEPER'
        "event-action-in-child",
        "queued-action-in-child-event-0",
        "queued-action-in-child-event-1",
        "queued-action-in-child-event-2",
        "queued-action-in-child-event-3",
        "queued-action-in-child-event-4",
        "second.child-exit",
        "queued-action-in-child-exit",
        // State: second.deeper
        "second.deeper-entry",
        "always-action-top",
        "scheduled-action-in-deeper",
        "always-action-top",
        // Event: 'GO'
        "event-action-in-deeper",
        "second-exit",
        // State: idle
        "idle-entry",
        "always-action-top",
        // Event: 'SCHEDULE_TEST'
        // 'scheduled-action-in-event' — is expectedly cancelled, because its state exits before timer is fired
        "idle-exit",
        // State: withSchedule
        "withSchedule-entry",
        "always-action-top",
        "scheduled-action-in-withSchedule",
        "always-action-top",
        // Event: 'GO'
        "event-action-in-withSchedule",
        // State: idle
        "idle-entry",
        "always-action-top",
      ]);
    });
  });

  describe("Restoring models from snapshots", () => {
    describe("when it is a model without state chart", () => {
      it("restores data and status", async () => {
        const model = new ModelWithoutStateChart();
        model.start();
        model.someEvent("updated data");
        await sleep(0);
        const snapshot = model.getPersistedSnapshot();
        model.stop();

        const restoredModel =
          ModelWithoutStateChart.fromPersistedSnapshot(snapshot);
        restoredModel.start();

        assert.ok(restoredModel.status === "active");
        assert.equal(restoredModel.data.some, "updated data");
      });
    });

    it("creates class avoiding constructor", async () => {
      class Base {
        constructor(public govno: string) {}
      }
      const model = Object.create(Base.prototype);
      assert.ok(!model.govno);
    });

    it("it restores a model as active", async () => {
      const parent = new ParentModel();
      parent.start();
      const snapshot = parent.toJSON();
      parent.stop();

      const newParent = ParentModel.fromJSON(snapshot);
      newParent.start();

      assert.ok(newParent instanceof ParentModel);
      assert.equal(newParent.status, "active");
      assert.equal(newParent._id, parent._id);
    });

    it("it restores a model with children and TOP node invoke", async () => {
      const parent = new ParentModel();
      parent.start();
      parent.addItem();
      parent.addItem();
      parent.addItem();
      parent.dispatch({ type: "SWITCH" });
      assert.ok(parent.matches("some"));
      assert.lengthOf(parent.data.children, 3);
      await sleep(205);
      assert.equal(parent.data.counter, 1);
      const snapshot = parent.toJSON();
      parent.stop();

      // Restore model
      const newParent = ParentModel.fromJSON(snapshot);
      newParent.start();

      assert.ok(newParent instanceof ParentModel);
      assert.equal(newParent._id, parent._id);
      assert.equal(newParent.status, "active");
      assert.lengthOf(newParent.data.children, 3);
      assert.equal(
        newParent.data.counter,
        1,
        "the counter value is restored from snapshot"
      );

      newParent.sendToChildren();

      newParent.data.children.forEach(child => {
        assert.equal(child.data.some, "from parent");
      });

      assert.ok(newParent.matches("some"), "should have restored state");
      await sleep(310);
      assert.equal(
        newParent.data.counter,
        2,
        "should invoke new TOP observable, and start counding from 0"
      );
    });

    it("it restores a model without no-explicit children", async () => {
      const parent = new ParentModelHiddenChildren();
      parent.start();
      parent.addItem();
      parent.addItem();
      parent.addItem();

      parent.dispatch({ type: "SWITCH" });
      assert.ok(parent.matches("some"));
      assert.equal(parent.childrenLength, 3);

      parent.sendToChildren();
      assert.deepEqual(
        parent.getChildrenData(),
        ["from parent", "from parent", "from parent"],
        "child models should receive a message"
      );

      const snapshot = parent.toJSON();
      parent.stop();

      // Restore model
      const newParent = ParentModelHiddenChildren.fromJSON(snapshot);
      newParent.start();

      assert.ok(newParent instanceof ParentModelHiddenChildren);
      assert.equal(newParent._id, parent._id);
      assert.equal(newParent.status, "active");
      assert.equal(
        newParent.childrenLength,
        0,
        "must not have children because they are not in snapshot"
      );
      assert.ok(newParent.matches("some"), "should have restored state");
    });

    it("stops restored children", async () => {
      const parent = new ParentModel();
      parent.start();
      parent.addItem();
      parent.addItem();
      parent.addItem();
      assert.lengthOf(parent.data.children, 3);
      const snapshot = parent.toJSON();
      parent.stop();

      // Restore model
      const newParent = ParentModel.fromJSON(snapshot);
      newParent.start();
      assert.lengthOf(newParent.data.children, 3);
      // assert.ok(newParent instanceof ParentModel);
      newParent.data.children.forEach(child =>
        assert.equal(child.status, "active")
      );

      // Stop the model
      newParent.stop();
      newParent.data.children.forEach(child =>
        assert.equal(child.status, "stopped")
      );
    });

    it("caches and restores with custom snapshot function", async () => {
      const parent = new CustomizedParentModelMachine();
      parent.start();
      parent.customProp = "new value";

      const snapshot = parent.getPersistedSnapshot();
      parent.stop();

      const newParent =
        CustomizedParentModelMachine.fromPersistedSnapshot(snapshot);
      newParent.start();

      assert.ok(newParent instanceof CustomizedParentModelMachine);
      assert.equal(newParent.status, "active");
      assert.equal(newParent.customProp, "new value");
    });
  });
});

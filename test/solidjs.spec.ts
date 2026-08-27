import { describe, it, assert, vi } from "vitest";
import { createRoot } from "solid-js";

import { useModel, useEvents } from "../src/solidjs";
import { ModelWithParams } from "./test-models/model-with-params";
import { ModelWithStateNodes } from "./test-models/model-with-state-nodes";
import { sleep } from "./test-kit";

describe("solidjs", () => {
  describe("useModel", () => {
    it("constructs the model with the given constructor args and starts it", () => {
      createRoot(dispose => {
        const model = useModel(ModelWithParams, 5, "hello");
        assert.equal(model.status, "active");
        assert.equal(model.data.count, 5);
        assert.equal(model.data.label, "hello");
        dispose();
      });
    });

    it("supports constructors with no arguments", () => {
      createRoot(dispose => {
        const model = useModel(ModelWithStateNodes);
        assert.equal(model.status, "active");
        assert.equal(model.state(), "default");
        dispose();
      });
    });

    it("creates a fresh, independent instance for each call", () => {
      createRoot(dispose => {
        const a = useModel(ModelWithParams, 1, "a");
        const b = useModel(ModelWithParams, 2, "b");
        assert.notEqual(a, b);
        assert.equal(a.data.count, 1);
        assert.equal(b.data.count, 2);
        dispose();
      });
    });

    it("stops the model when the owning root is disposed", () => {
      let model!: ModelWithParams;
      createRoot(dispose => {
        model = useModel(ModelWithParams, 0, "x");
        dispose();
      });
      assert.equal(model.status, "stopped");
    });

    it("the returned model behaves like a normal instance", () => {
      createRoot(async dispose => {
        const model = useModel(ModelWithParams, 0, "counter");
        model.increment();
        model.increment();
        await sleep(0);
        assert.equal(model.data.count, 2);
        dispose();
      });
    });
  });

  describe("useEvents", () => {
    it("invokes the matching handler for an emitted event", () => {
      createRoot(dispose => {
        const model = useModel(ModelWithStateNodes);
        const onSomeHappened = vi.fn();

        useEvents(model, {
          SOME_HAPPEND: onSomeHappened,
        });

        model.send.SOME({ value: "one" });
        model.send.OTHER({ value: "three" });

        assert.equal(onSomeHappened.mock.calls.length, 1);
        dispose();
      });
    });

    it("passes the emitted event to the handler", () => {
      createRoot(dispose => {
        const model = useModel(ModelWithStateNodes);
        let received: unknown;

        useEvents(model, {
          SOME_HAPPEND: event => {
            received = event;
          },
        });

        model.send.SOME({ value: "one" });
        model.send.OTHER({ value: "three" });

        assert.deepEqual(received, { type: "SOME_HAPPEND" });
        dispose();
      });
    });

    it("does not throw when the owning root is disposed", () => {
      createRoot(dispose => {
        const model = useModel(ModelWithStateNodes);
        useEvents(model, {
          SOME_HAPPEND: vi.fn(),
        });
        assert.doesNotThrow(() => dispose());
      });
    });
  });
});

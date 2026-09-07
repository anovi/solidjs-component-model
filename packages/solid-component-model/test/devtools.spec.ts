import { it, describe, assert } from "vitest";

import { type GlobalDevContext } from "../src/devtools";
import { sleep } from "./test-kit";

describe("devtools", () => {
  const globalObj = globalThis as unknown as GlobalDevContext;
  globalObj.__COMPONENT_MODEL_DEVMODE__ = true;

  it("should have global devtool", async () => {
    const module = await import("../src");
    void module;
    const devtool = globalObj.__COMPONENT_MODEL_DEVTOOLS__;
    assert.ok(devtool);
    assert.equal(devtool.version, "1.0.0");
  });

  it("should get models", async () => {
    const { ParentModel } = await import("./test-models/parent-model");

    const parent = new ParentModel();
    parent.start();

    parent.addItem();
    await sleep(0);

    const bridge = globalObj.__COMPONENT_MODEL_DEVTOOLS__;

    const snapshots = bridge.getAllSnapshots();

    assert.ok(snapshots);
    assert.ok(snapshots[parent._id]);
  });
});

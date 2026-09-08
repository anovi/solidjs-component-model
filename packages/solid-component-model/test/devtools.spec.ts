import { it, describe, assert } from "vitest";
import {
  createApiClient,
  createDirectClientTransport,
} from "@solid-component-model/rpc";
import {
  type GlobalDevContext,
  type ComponentModelDevToolsApi,
} from "../src/devtools-types";
import { sleep } from "./test-kit";

describe("devtools", () => {
  const globalObj = globalThis as unknown as GlobalDevContext;
  globalObj.__COMPONENT_MODEL_DEVMODE__ = true;

  it("should have global devtool server", async () => {
    const module = await import("../src");
    void module;
    const devtool = globalObj.__COMPONENT_MODEL_DEVTOOLS__;
    assert.ok(devtool);
    assert.ok(devtool.has("version"));
    assert.ok(devtool.has("getModels"));
    assert.ok(devtool.has("getAllSnapshots"));

    const client = createApiClient<ComponentModelDevToolsApi>({
      source: "devtools-rpc",
      transport: createDirectClientTransport(devtool),
    });

    const version = await client.request("version");
    assert.equal(version, "1.0.0");
  });

  it("should get models and snapshots via ApiClient", async () => {
    const { ParentModel } = await import("./test-models/parent-model");

    const parent = new ParentModel();
    parent.start();

    parent.addItem();
    await sleep(0);

    const devtool = globalObj.__COMPONENT_MODEL_DEVTOOLS__;
    assert.ok(devtool);

    const client = createApiClient<ComponentModelDevToolsApi>({
      source: "devtools-rpc",
      transport: createDirectClientTransport(devtool),
    });

    const models = await client.request("getModels");
    assert.ok(Array.isArray(models));
    assert.ok(models.includes(parent._id));

    const snapshots = await client.request("getAllSnapshots");
    assert.ok(snapshots);
    assert.ok(snapshots[parent._id]);
  });
});

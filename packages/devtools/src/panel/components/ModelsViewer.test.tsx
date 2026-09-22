// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import { render } from "solid-js/web";
import { ApiClientContext, type ApiClientProviderProps } from "../context";
import { createModelsStore, type ModelSnapshot } from "../stores/models";
import { ModelsViewer } from "./ModelsViewer";
import { createModelsViewerPage } from "./models-viewer-page";

// Capture the external selection notification while rendering the actual tree.
const selection = vi.hoisted(() => ({ notify: undefined as undefined | ((details: { selectedValue: string[] }) => void) }));
vi.mock("@ark-ui/solid", async importOriginal => {
  const actual = await importOriginal<typeof import("@ark-ui/solid")>();
  return {
    ...actual,
    TreeView: {
      ...actual.TreeView,
      Root: (props: Parameters<typeof actual.TreeView.Root>[0]) => {
        selection.notify = props.onSelectionChange as typeof selection.notify;
        return <actual.TreeView.Root {...props} />;
      },
    },
  };
});

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe("ModelsViewer reactive collection", () => {
  const snapshot = (
    id: string,
    parentId?: string,
    childrenIds: string[] = []
  ): ModelSnapshot => ({
    _id: id,
    name: id,
    parentId,
    childrenIds,
    data: {},
    state: "",
    status: "active",
  });

  let dispose: (() => void) | undefined;
  afterEach(() => {
    dispose?.();
    document.body.replaceChildren();
  });

  function setup(initial: ModelSnapshot[] = []) {
    const [store, setStore] = createStore({ models: initial, charts: [] });
    const container = document.createElement("div");
    document.body.append(container);
    const context = { devtools: store } as unknown as ApiClientProviderProps;
    dispose = render(
      () => (
        <ApiClientContext.Provider value={context}>
          <ModelsViewer />
        </ApiClientContext.Provider>
      ),
      container
    );
    return { page: createModelsViewerPage(container), setStore };
  }

  it("renders every root arriving after mount, then follows renames and removals", async () => {
    const { page, setStore } = setup();
    for (let i = 0; i < 6; i++) {
      setStore("models", i, snapshot(`model-${i}`));
    }
    await tick();
    expect(page.modelNames()).toHaveLength(6);
    setStore("models", 0, "name", "renamed");
    setStore("models", models =>
      models.filter(model => model._id !== "model-2")
    );
    await tick();
    expect(page.modelNames()).toContain("renamed");
    expect(page.modelNames()).not.toContain("model-2");
    expect(page.modelNames()).toHaveLength(5);
  });

  it("resolves children arriving before their parent and updates expanded descendants", async () => {
    const { page, setStore } = setup();
    setStore("models", 0, snapshot("child", "parent", ["grandchild"]));
    setStore("models", 1, snapshot("parent", undefined, ["child"]));
    await tick();
    await page.expandModel("parent");
    expect(page.modelNames()).toContain("child");
    setStore("models", 2, snapshot("grandchild", "child"));
    await tick();
    expect(page.expandableModelNames()).toHaveLength(2);
    expect(page.isModelExpanded("parent")).toBe(true);
    await page.expandModel("child");
    expect(page.modelNames()).toContain("grandchild");
    setStore("models", models =>
      models.filter(model => model._id !== "grandchild")
    );
    await tick();
    expect(page.modelNames()).not.toContain("grandchild");
    expect(page.expandableModelNames()).toHaveLength(1);
  });
});

describe("ModelsViewer retained inspection", () => {
  const snapshot = (id: string, values: Partial<ModelSnapshot> = {}): ModelSnapshot => ({
    _id: id, name: `Model ${id}`, chartId: "chart", state: "initial",
    status: "active", data: { value: "initial data" }, ...values,
  });
  let dispose: (() => void) | undefined;
  const store = createModelsStore();
  afterEach(() => {
    dispose?.();
    store.reset();
    document.body.replaceChildren();
  });

  function setup(ids = ["a", "b"]) {
    store.reset();
    ids.forEach(id => store.addModel(snapshot(id)));
    const container = document.createElement("div");
    document.body.append(container);
    const context = {
      devtools: {
        get models() { return store.models; },
        charts: [{ _id: "chart", states: ["initial", "finished"] }],
      },
    } as unknown as ApiClientProviderProps;
    dispose = render(() => (
      <ApiClientContext.Provider value={context}>
        <ModelsViewer />
      </ApiClientContext.Provider>
    ), container);
    return createModelsViewerPage(container);
  }

  for (const status of ["stopped", "error"] as const) {
    it(`retains final ${status} state and data after synchronous update/removal, then switches selection`, async () => {
      const page = setup();
      await page.selectModel("Model a");
      store.updateModel(snapshot("a", { data: { value: "live update" } }));
      await tick();
      expect(page.inspectionText()).toContain("live update");
      batch(() => {
        store.updateModel(snapshot("a", { status, state: "finished", data: { value: "final data" } }));
        store.removeModel("a");
      });
      await tick();
      expect(page.modelNames()).not.toContain("Model a");
      expect(page.inspectionText()).toContain("Model a");
      expect(page.inspectedModelId()).toBe("a");
      expect(page.inspectedModelStatus()).toBe(status);
      expect(page.activeState()).toBe("finished");
      expect(page.inspectionText()).toContain("final data");
      await page.selectModel("Model b");
      expect(page.inspectionText()).toContain("Model b");
      expect(page.inspectionText()).not.toContain("Model a");
      store.updateModel(snapshot("b", { data: { value: "new selection update" } }));
      await tick();
      expect(page.inspectionText()).toContain("new selection update");
    });
  }

  it("retains details when unrelated models and then the last sidebar item are removed", async () => {
    const page = setup();
    await page.selectModel("Model a");
    store.removeModel("b");
    await tick();
    expect(page.inspectionText()).toContain("Model a");
    batch(() => {
      store.updateModel(snapshot("a", { status: "stopped", state: "finished", data: { value: "last data" } }));
      store.removeModel("a");
    });
    await tick();
    expect(page.modelNames()).toHaveLength(0);
    expect(page.inspectionText()).toContain("last data");
    expect(page.inspectedModelStatus()).toBe("stopped");
  });

  it("keeps inspected details when the sidebar clears its selection", async () => {
    const page = setup();
    await page.selectModel("Model a");
    selection.notify!({ selectedValue: [] });
    await tick();
    expect(page.isModelSelected("Model a")).toBe(false);
    expect(page.inspectionText()).toContain("Model a");
  });
});

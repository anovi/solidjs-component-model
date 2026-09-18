// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createStore } from "solid-js/store";
import { ApiClientContext, type ApiClientProviderProps } from "../context";
import type { ModelSnapshot } from "../stores/models";
import { ModelsViewer } from "./ModelsViewer";

vi.mock("./ModelView", () => ({ ModelView: () => null }));

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
  return { container, setStore };
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe("ModelsViewer reactive collection", () => {
  it("renders every root arriving after mount, then follows renames and removals", async () => {
    const { container, setStore } = setup();
    for (let i = 0; i < 6; i++) {
      setStore("models", i, snapshot(`model-${i}`));
    }
    await tick();
    expect(container.querySelectorAll('[data-part="item"]')).toHaveLength(6);
    setStore("models", 0, "name", "renamed");
    setStore("models", models =>
      models.filter(model => model._id !== "model-2")
    );
    await tick();
    expect(container.textContent).toContain("renamed");
    expect(container.textContent).not.toContain("model-2");
    expect(container.querySelectorAll('[data-part="item"]')).toHaveLength(5);
  });

  it("resolves children arriving before their parent and updates expanded descendants", async () => {
    const { container, setStore } = setup();
    setStore("models", 0, snapshot("child", "parent", ["grandchild"]));
    setStore("models", 1, snapshot("parent", undefined, ["child"]));
    await tick();
    (
      container.querySelector('[data-part="branch-control"]') as HTMLElement
    ).click();
    await tick();
    expect(container.textContent).toContain("child");
    setStore("models", 2, snapshot("grandchild", "child"));
    await tick();
    const controls = container.querySelectorAll<HTMLElement>(
      '[data-part="branch-control"]'
    );
    expect(controls).toHaveLength(2);
    expect(controls[0].getAttribute("data-state")).toBe("open");
    controls[1].click();
    await tick();
    expect(container.textContent).toContain("grandchild");
    setStore("models", models =>
      models.filter(model => model._id !== "grandchild")
    );
    await tick();
    expect(container.textContent).not.toContain("grandchild");
    expect(
      container.querySelectorAll('[data-part="branch-control"]')
    ).toHaveLength(1);
  });
});

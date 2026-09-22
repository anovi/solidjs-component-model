/** Creates an API for inspecting and interacting with the models viewer. */
export function createModelsViewerPage(container: HTMLElement) {
  /** Finds the model sidebar. */
  const sidebar = () => container.querySelector('[data-part="left"]')!;
  /** Finds the inspection panel. */
  const details = () => container.querySelector('[data-part="main"]')!;
  /** Finds the model items in the sidebar. */
  const modelItems = () => [
    ...sidebar().querySelectorAll<HTMLElement>('[data-part="item"]'),
  ];

  /** Finds a model item in the sidebar, throwing if it is missing. */
  function modelItem(name: string) {
    const item = modelItems().find(item => item.textContent === name);
    if (!item) throw new Error(`Model "${name}" is not listed in the sidebar`);
    return item;
  }

  /** Finds a model's expansion control, throwing if it is missing. */
  function expansionControl(name: string) {
    const control = modelItem(name).querySelector<HTMLElement>(
      '[data-part="branch-control"]'
    );
    if (!control) throw new Error(`Model "${name}" has no expansion control`);
    return control;
  }

  return {
    /** Returns the names of models listed in the sidebar. */
    modelNames: () => modelItems().map(item => item.textContent),
    /** Returns the names of models that have expandable children. */
    expandableModelNames: () =>
      modelItems()
        .filter(item => item.querySelector('[data-part="branch-control"]'))
        .map(item => item.textContent),
    /** Reports whether a model's children are expanded. */
    isModelExpanded: (name: string) =>
      expansionControl(name).getAttribute("data-state") === "open",
    /** Expands a model's children and waits for the view to update. */
    async expandModel(name: string) {
      const control = expansionControl(name);
      if (control.getAttribute("data-state") !== "open") control.click();
      await new Promise(resolve => setTimeout(resolve, 0));
    },
    /** Returns all text displayed in the inspection panel. */
    inspectionText: () => details().textContent,
    /** Returns the inspected model's displayed ID. */
    inspectedModelId: () =>
      details().querySelector(".devtools-model-view__description")?.textContent,
    /** Returns the inspected model's displayed status. */
    inspectedModelStatus: () =>
      details().querySelector(".devtools-model-view__status")?.textContent,
    /** Returns the text of the first active state in the inspection panel. */
    activeState: () =>
      details().querySelector(".state-tree__node.active")?.textContent,
    /** Reports whether a model is selected in the sidebar. */
    isModelSelected: (name: string) =>
      modelItem(name).hasAttribute("data-selected"),
    /** Selects a model in the sidebar and waits for the view to update. */
    async selectModel(name: string) {
      modelItem(name).click();
      await new Promise(resolve => setTimeout(resolve, 0));
    },
  };
}

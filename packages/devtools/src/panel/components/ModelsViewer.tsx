import { For, type Component, useContext, createSignal, createMemo, onCleanup, onMount, on } from "solid-js";
import {
  TreeView,
  createTreeCollection,
} from "@ark-ui/solid";
import { AnyModelData, Status } from "solid-component-model";

import './styles.css';
import { ApiClientContext } from "../context";
import { ModelSnapshot } from "../stores/models";
import { unwrap } from "solid-js/store";
import { JsonViewer } from "./JsonView";


export const ModelsViewer: Component = () => {
  const ctx = useContext(ApiClientContext)!;
  const models = ctx.devtools.models;

  const collection = createTreeCollection<ModelSnapshot>({
    nodeToValue: (item) => item._id,
    nodeToString: (item) => item.name,
    rootNode: {
      _id: "root",
      name: "root",
      state: "",
      data: {} as AnyModelData,
      status: {} as Status,
      children: models,
    },
  });

  onMount(() => {
    const sub = ctx.client.onModelUpdated((model) => {
      const indexPath = collection.getIndexPath(model._id)
      if (indexPath) collection.replace(indexPath, model)
    });
    onCleanup(sub.unsubscribe);
  });

  const [selected, setSelected] = createSignal<string[]>([]);

  const selectedItemIndex = createMemo(on(selected, () => {
    const selValue = selected()[0];
    return models.findIndex((m) => m._id === selValue)
  }))

  const itemState = createMemo(() => {
    const index = selectedItemIndex();
    const item = models.find((_, i) => i === index);
    return item;
  })

  return (
    <div class="surface">
      <div class="layout">
        <div data-part="left">
          <div class="devtools-model-tree">
            <TreeView.Root
              collection={collection}
              selectionMode="single"
              selectedValue={selected()}
              onSelectionChange={(details) => {
                setSelected(details.selectedValue);
              }}
            >
              <TreeView.Tree>
                <For each={models}>
                  {(item, index) => (
                    <TreeView.NodeProvider
                      node={item}
                      indexPath={[index()]}
                    >
                      <TreeView.Item>
                        <TreeView.ItemText>
                          {item.name}
                        </TreeView.ItemText>
                      </TreeView.Item>
                    </TreeView.NodeProvider>
                  )}
                </For>
              </TreeView.Tree>
            </TreeView.Root>
            {/* <For each={models}>
              {model => {
                return <code class="devtools-model-tag">{model.name}</code>
              }}
            </For> */}
          </div>
        </div>
        <div data-part="main">
          <JsonViewer value={itemState()} />
        </div>
      </div>
    </div>
  );
};

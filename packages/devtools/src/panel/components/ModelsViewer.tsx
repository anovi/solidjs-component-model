import {
  type Component,
  useContext,
  createSignal,
  createMemo,
  For,
  Show,
} from "solid-js";
import { TreeView, createTreeCollection } from "@ark-ui/solid";

import "./styles.css";
import { ApiClientContext } from "../context";
import { ModelSnapshot } from "../stores/models";
import { ModelView } from "./ModelView";

type TreeNode = {
  id: string;
  name: string;
  children?: TreeNode[];
};

function fromSnapshot(sn: ModelSnapshot, models: ModelSnapshot[]): TreeNode {
  const children = (sn.childrenIds || [])
    .map(id => models.find(model => model._id === id))
    .filter((model): model is ModelSnapshot => model !== undefined)
    .map(model => fromSnapshot(model, models));

  return {
    id: sn._id,
    name: sn.name,
    ...(children.length > 0 ? { children } : {}),
  };
}

export const ModelsViewer: Component = () => {
  const ctx = useContext(ApiClientContext)!;
  // Ark collections are immutable. Rebuild from the reactive store rather than
  // maintaining a second tree through RPC events (which can arrive out of order).
  const collection = createMemo(() => {
    const models = ctx.devtools.models;
    return createTreeCollection<TreeNode>({
      nodeToValue: item => item.id,
      nodeToString: item => item.name,
      rootNode: {
        id: "root",
        name: "root",
        children: models
          .filter(model => model.parentId == null)
          .map(model => fromSnapshot(model, models)),
      },
    });
  });

  const [selected, setSelected] = createSignal<string[]>([]);

  const selectedItem = createMemo(() => {
    const id = selected()[0];
    const res = ctx.devtools.models.find(model => model._id === id);
    return res;
  });

  return (
    <div class="">
      <div class="layout">
        <div data-part="left">
          <div class="devtools-model-tree">
            <TreeView.Root
              collection={collection()}
              selectionMode="single"
              selectedValue={selected()}
              onSelectionChange={details => {
                setSelected(details.selectedValue);
              }}
            >
              <TreeView.Tree>
                <For each={collection().rootNode.children}>
                  {(node, index) => (
                    <TreeNode node={node} indexPath={[index()]} />
                  )}
                </For>
              </TreeView.Tree>
            </TreeView.Root>
          </div>
        </div>
        <div data-part="main">
          {/* <JsonViewer value={selectedItem() as JsonValue} /> */}
          <Show when={selectedItem()}>
            <ModelView model={selectedItem()!} />
          </Show>
        </div>
      </div>
    </div>
  );
};

const TreeNode = (props: TreeView.NodeProviderProps<TreeNode>) => {
  return (
    <TreeView.NodeProvider node={props.node} indexPath={props.indexPath}>
      <TreeView.NodeContext>
        {nodeState => {
          return (
            <Show
              when={props.node.children?.length}
              fallback={
                <TreeView.Item>
                  <TreeView.ItemText>{props.node.name}</TreeView.ItemText>
                </TreeView.Item>
              }
            >
              <TreeView.Branch>
                <TreeView.Item>
                  <TreeView.BranchControl>
                    <TreeView.BranchIndicator>
                      {nodeState().expanded ? "▼" : "▶  "}
                    </TreeView.BranchIndicator>
                  </TreeView.BranchControl>
                  <TreeView.ItemText>{props.node.name}</TreeView.ItemText>
                </TreeView.Item>
                <TreeView.BranchContent>
                  {/* <TreeView.BranchIndentGuide /> */}
                  <For each={props.node.children}>
                    {(child, index) => (
                      <TreeNode
                        node={child}
                        indexPath={[...props.indexPath, index()]}
                      />
                    )}
                  </For>
                </TreeView.BranchContent>
              </TreeView.Branch>
            </Show>
          );
        }}
      </TreeView.NodeContext>
    </TreeView.NodeProvider>
  );
};

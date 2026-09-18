import { type Component, useContext, createSignal, createMemo, onCleanup, onMount, For, Show } from "solid-js";
import {
  TreeView,
  createTreeCollection,
} from "@ark-ui/solid";
import { AnyModelData } from "solid-component-model";

import './styles.css';
import { ApiClientContext } from "../context";
import { ModelSnapshot } from "../stores/models";
import { ModelView } from "./ModelView";


type TreeNode = {
  id: string,
  name: string,
  children?: TreeNode[]
}

function fromSnapshot(
  sn: ModelSnapshot,
  models: ModelSnapshot[],
  previous?: TreeNode,
): TreeNode {
  const previousChildren = new Map(
    previous?.children?.map(child => [child.id, child]) ?? [],
  );

  const children = (sn.childrenIds || [])
    .map(id => models.find(model => model._id === id))
    .filter((model): model is ModelSnapshot => model !== undefined)
    .map(model => {
      const existing = previousChildren.get(model._id);

      // Child already exists — keep its TreeNode identity.
      if (existing) {
        return existing;
      }

      // New child — build its subtree.
      return fromSnapshot(model, models);
    });

  return {
    id: sn._id,
    name: sn.name,
    ...(children.length > 0 ? { children } : {}),
  };
}

export const ModelsViewer: Component = () => {
  const ctx = useContext(ApiClientContext)!;
  const rootNodes = ctx.devtools.models.filter(m => m.parentId == null);

  const _collection = createTreeCollection<TreeNode>({
    nodeToValue: (item) => item.id,
    nodeToString: (item) => item.name,
    rootNode: fromSnapshot({
      _id: "root",
      name: "root",
      data: null as unknown as AnyModelData,
      state: '',
      status: 'active',
      childrenIds: rootNodes.map(m => m._id),
    }, ctx.devtools.models),
  });

  const [collection, setCollection] = createSignal(_collection);

  onMount(() => {
    const added = ctx.client.onModelAdded((model) => {
      const parent = model.parentId ? collection().findNode(model.parentId) : null;
      const lastChild = parent?.children?.[parent.children.length - 1];
      const indexPath = lastChild
        ? collection().getIndexPath(lastChild.id) || [0]
        : parent ? collection().getIndexPath(parent.id)?.concat([0]) || [0] : [0]
      
      const result = collection().insertAfter(indexPath, [fromSnapshot(model, ctx.devtools.models)]);
      if (result) setCollection(result);
    });
    const removed = ctx.client.onModelRemoved((id) => {
      const toDelete = collection().findNode(id);
      if (!toDelete) return;
      const indexPath = collection().getIndexPath(toDelete.id);
      if (!indexPath) return;
      setCollection(collection().remove([indexPath]));
    });
    onCleanup(() => { added.unsubscribe(); removed.unsubscribe(); });
  });

  const [selected, setSelected] = createSignal<string[]>([]);

  const selectedItem = createMemo(() => {
    const id = selected()[0];
    const res = ctx.devtools.models.find((model) => model._id === id);
    return res
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
              onSelectionChange={(details) => {
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
  const { node, indexPath } = props;
  
  return (
    <TreeView.NodeProvider node={node} indexPath={indexPath}>
      <TreeView.NodeContext>
        {(nodeState) => {
          return node.children ? (
            <TreeView.Branch>
                <TreeView.Item>
                <TreeView.BranchControl>
                  <TreeView.BranchIndicator>
                    {nodeState().expanded ? "▼" : "▶  " }
                  </TreeView.BranchIndicator>
                </TreeView.BranchControl>
                  <TreeView.ItemText>
                    {node.name}
                  </TreeView.ItemText>
                </TreeView.Item>
              <TreeView.BranchContent>
                {/* <TreeView.BranchIndentGuide /> */}
                <For each={node.children}>
                  {(child, index) => (
                    <TreeNode node={child} indexPath={[...indexPath, index()]} />
                  )}
                </For>
              </TreeView.BranchContent>
            </TreeView.Branch>
          ) : (
            <TreeView.Item>
              <TreeView.ItemText>
                {node.name}
              </TreeView.ItemText>
            </TreeView.Item>
          )
        }}
      </TreeView.NodeContext>
    </TreeView.NodeProvider>
  )
}
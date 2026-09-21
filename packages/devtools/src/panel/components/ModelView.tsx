// import { Accessor } from 'solid-js';
import { type JsonValue, JsonViewer } from "./JsonView";
import { type ModelSnapshot } from "../stores/models";
import './model-view.css';
import { createMemo, For, Show, useContext } from "solid-js";
import { ApiClientContext } from "../context";


type ModelViewProps = {
  model: ModelSnapshot;
};

type StateNode = {
  name: string;
  path: string;
  children: StateNode[];
};

function buildStateTree(states: string[]): StateNode[] {
  const roots: StateNode[] = [];

  for (const path of states) {
    const parts = path.split(".");
    let level = roots;
    let currentPath = "";

    for (const name of parts) {
      currentPath = currentPath
        ? `${currentPath}.${name}`
        : name;

      let node = level.find((node) => node.name === name);

      if (!node) {
        node = {
          name,
          path: currentPath,
          children: [],
        };

        level.push(node);
      }

      level = node.children;
    }
  }

  return roots;
}

type StateTreeGuide = {
  text: string;
  active: boolean;
};

function StateTree(props: {
  nodes: StateNode[];
  currentState: string;
}) {
  const rows = createMemo(() => {
    const active = (node: StateNode) =>
      props.currentState === node.path ||
      props.currentState.startsWith(node.path + ".");

    const result: {
      node: StateNode;
      active: boolean;
      guides: StateTreeGuide[];
    }[] = [];

    function visit(nodes: StateNode[], prefix: StateTreeGuide[]) {
      const activeIndex = nodes.findIndex(active);

      nodes.forEach((node, index) => {
        const last = index === nodes.length - 1;
        const nodeActive = active(node);

        result.push({
          node,
          active: nodeActive,
          guides: [
            ...prefix,
            { text: last ? "└" : "├", active: activeIndex >= index },
            { text: "─ ", active: nodeActive },
          ],
        });

        visit(node.children, [
          ...prefix,
          { text: last ? "   " : "│   ", active: activeIndex > index },
        ]);
      });
    }

    visit(props.nodes, []);
    return result;
  });

  return (
    <pre class="state-tree">
      <For each={rows()}>
        {(row) => (
          <>
            <For each={row.guides}>
              {(guide) => (
                <span
                  class="state-tree__guide"
                  classList={{ active: guide.active }}
                  aria-hidden="true"
                >
                  {guide.text}
                </span>
              )}
            </For>
            <span class="state-tree__node" classList={{ active: row.active }}>
              {row.node.name}
            </span>
            {"\n"}
          </>
        )}
      </For>
    </pre>
  );
}

// export function ModelView(props: ModelViewProps) {
//   const context = useContext(ApiClientContext);
//   const chart = context?.devtools.charts.find((chart) => chart._id === props.model.chartId);
//   chart?.states

//   return <div class="devtools-model-view">
//     <div>{props.model.name}<span class={"devtools-model-view__status " + props.model.status}>{props.model.status}</span>
//       <br /><small class="devtools-model-view__description">{props.model._id}</small>
//     </div>
//     <div> State:
//       <Show when={chart} fallback={props.model.state}>
//         props.model.state 
//       </Show>
//     </div>
//     {/* <div> Chart: {chart?.states.join(' | ')} </div> */}

//     <hr />
    
//     <JsonViewer value={props.model.data as JsonValue} />
//   </div>
// }



export function ModelView(props: ModelViewProps) {
  const context = useContext(ApiClientContext);

  const chart = createMemo(() =>
    context?.devtools.charts.find(
      (chart) => chart._id === props.model.chartId
    )
  );

  const stateTree = createMemo(() => {
    const selectedChart = chart();
    return selectedChart ? buildStateTree(selectedChart.states) : [];
  });

  return (
    <div class="devtools-model-view">
      <div class="devtools-model-view__grid">
        <div class="devtools-model-view__head">
          {props.model.name}
          <span
            class={
              "devtools-model-view__status " +
              props.model.status
            }
          >
            {props.model.status}
          </span>
          <br />
          <small class="devtools-model-view__description">
            {props.model._id}
          </small>
          <Show when={chart()} fallback={<div>props.model.state</div>}>
            <StateTree
              nodes={stateTree()}
              currentState={props.model.state}
            />
          </Show>
        </div>

        <div class="devtools-model-view__details">
          {/* <h4>Data</h4> */}
          <JsonViewer value={props.model.data as JsonValue} />
        </div>
      </div>
    </div>
  );
}

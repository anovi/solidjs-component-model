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

function StateTree(props: {
  nodes: StateNode[];
  currentState: string;
}) {
  return (
    <ul class="state-tree">
      <For each={props.nodes}>
        {(node) => {
          const active = () =>
            props.currentState === node.path ||
            props.currentState.startsWith(node.path + ".");

          return (
            <li>
              <div
                class="state-tree__node"
                classList={{ active: active() }}
              >
                {node.name}
              </div>

              <Show when={node.children.length > 0}>
                <StateTree
                  nodes={node.children}
                  currentState={props.currentState}
                />
              </Show>
            </li>
          );
        }}
      </For>
    </ul>
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

  const chart = context?.devtools.charts.find(
    (chart) => chart._id === props.model.chartId
  );

  const stateTree = createMemo(() =>
    chart ? buildStateTree(chart.states) : []
  );

  return (
    <div class="devtools-model-view">
      <div>
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
      </div>

      <div>
        State:

        <Show when={chart} fallback={props.model.state}>
          <StateTree
            nodes={stateTree()}
            currentState={props.model.state}
          />
        </Show>
      </div>

      <hr />

      <JsonViewer value={props.model.data as JsonValue} />
    </div>
  );
}
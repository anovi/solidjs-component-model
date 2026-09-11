import { For, type Component, Switch, Match, useContext } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import { createDevtoolsState } from "../hooks/useDevtoolsState";
import './styles.css';
import { ApiClientContext } from "../context";

export interface DevtoolsPanelProps {
  client: ApiClient;
  class?: string;
}

/**
 * Devtools Panel UI SolidJS Component.
 * Interacts with the inspected application via an ApiClient.
 */
export const DevtoolsPanel: Component<DevtoolsPanelProps> = props => {
  const ctx = useContext(ApiClientContext)!;
  chrome.devtools.inspectedWindow.eval(`console.log("Context!")`);
  const devtools = createDevtoolsState(ctx.client, ctx.logger);
  chrome.devtools.inspectedWindow.eval(`console.log("After dev tools created!")`);

  return (
    <div class={`devtools-panel-root ${props.class ?? ""}`}>

      <div class="devtools-panel-header">
        <h2>Inspector Panel</h2>
        <p>Communicating directly with application models via RPC</p>
      </div>

      <div class="devtools-panel-toolbar">
        <button
          class="devtools-btn devtools-btn-primary"
          disabled={devtools.state() === 'loading'}
          // onClick={() => state.refresh()}
        >
          {devtools.state() === 'loading' ? "Fetching..." : "Fetch Models"}
        </button>
        <button
          class="devtools-btn devtools-btn-secondary"
          // onClick={() => state.clearLog()}
        >
          Clear Log
        </button>
      </div>

      <Switch>
        <Match when={devtools.state() === 'loading'}>Loading…</Match>

        <Match when={devtools.state() === 'error'}>
          <pre class="devtools-log-viewer">
            {"Error:" + devtools.error()}
          </pre>
        </Match>

        <Match when={devtools.state() === 'ok'}>
          <div class="devtools-models-preview">
            <span class="devtools-models-label">
              Discovered Models ({devtools.models.length}):
            </span>
            <div class="devtools-models-tags">
              <For each={devtools.models}>
                {model => <code class="devtools-model-tag">{model._id}</code>}
              </For>
            </div>
          </div>
        </Match>
      </Switch>

      <pre class="devtools-log-viewer">
        <For each ={devtools.logger.logs}>
          {(line) => {
            return <div class="log-line" classList={{
              "log-error": line.type === 'error',
              "log-info": line.type === 'info',
              "log-warn": line.type === 'warn',
            }}>
              <span class="log-time">{line.time}</span> <span>{line.message}</span>
            </div>
          }}
        </For>
      </pre>
    </div>
  );
};

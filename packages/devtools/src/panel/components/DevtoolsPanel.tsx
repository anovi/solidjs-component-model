import { For, type Component, Switch, Match, useContext, Show, createSignal } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import './styles.css';
import { ApiClientContext } from "../context";
import { ModelsViewer } from "./ModelsViewer";

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
  const devtools = ctx.devtools;
  const [tabId, setTabId] = createSignal<'Models'|'Logs'>('Models');

  return (
    <div class={`devtools-panel-root ${props.class ?? ""}`}>
      <div class="devtools-panel-head">
        <div class="devtools-panel-header">
          <h2>Inspector</h2>
          {/* <p>Communicating directly with application models via RPC</p> */}
        </div>

        <div class="devtools-panel-toolbar">
          <div class="tabs">
            <button class="tab" classList={{ 'tab-active': tabId() === 'Models' }} onclick={() => setTabId('Models')}>Models</button>
            <button class="tab" classList={{ 'tab-active': tabId() === 'Logs' }} onclick={() => setTabId('Logs')}>Logs</button>
          </div>
        </div>
      </div>

      <Switch>
        <Match when={tabId() === 'Logs'}>
          <pre class="devtools-log-viewer">
            <div class="devtools-log-toolbar">
              <button
                class="devtools-btn devtools-btn-primary"
                disabled={devtools.state() === 'loading'}
                onClick={() => ctx.logger.clear()}
              >Clear</button>
            </div>
            <Show when={ctx.logger.logs}>
              {logs => <div>logs: {logs().length}</div>}
            </Show>
            <For each={ctx.logger.logs}>
              {(line) => {
                return <div class="log-line" classList={{
                  "log-error": line.type === 'error',
                  "log-info": line.type === 'info',
                  "log-warn": line.type === 'warn',
                }}>
                  <span class="log-time">{line.time}</span> <span class="log-msg">{line.message}</span>
                </div>
              }}
            </For>
          </pre>
        </Match>

        <Match when={tabId() === 'Models'}>
          <Switch>
            <Match when={devtools.state() === 'loading'}>Loading…</Match>
            <Match when={devtools.state() === 'error'}>
              <pre class="devtools-log-viewer">
                {"Error:" + devtools.error()}
              </pre>
            </Match>
            <Match when={devtools.state() === 'ok'}>
              <ModelsViewer />
            </Match>
          </Switch>
        </Match>
      </Switch>

    </div>
  );
};

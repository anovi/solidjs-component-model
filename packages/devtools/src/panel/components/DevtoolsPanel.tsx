import { For, type Component, Switch, Match, useContext, Show, createSignal, onCleanup } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import { ApiClientContext } from "../context";
import { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from "../hooks/useDevtoolsState";
import { ModelsViewer } from "./ModelsViewer";
import { PanelHeader } from "./PanelHeader";
import './styles.css';

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
    <div class={`devtools-panel-root ${props.class ?? ""}`} style={{ "--sidebar-width": `${devtools.layout().sidebarWidth}px` }}>
      <PanelHeader>
        <div class="devtools-panel-toolbar tabs">
          <button class="tab" classList={{ 'tab-active': tabId() === 'Models' }} onclick={() => setTabId('Models')}>Models</button>
          <button class="tab" classList={{ 'tab-active': tabId() === 'Logs' }} onclick={() => setTabId('Logs')}>Logs</button>
        </div>
      </PanelHeader>

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
              <ModelsViewer divider={<SidebarDivider />} />
            </Match>
          </Switch>
        </Match>
      </Switch>

    </div>
  );
};


const SidebarDivider: Component = () => {
  const { devtools } = useContext(ApiClientContext)!;
  const [dragging, setDragging] = createSignal(false);
  let stopDrag = () => {};
  onCleanup(() => stopDrag());

  function startDrag(event: MouseEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    stopDrag();
    const startX = event.clientX;
    const startWidth = devtools.layout().sidebarWidth;
    const body = event.currentTarget instanceof HTMLElement
      ? event.currentTarget.ownerDocument.body : document.body;
    const previousCursor = body.style.cursor;
    const previousSelection = body.style.userSelect;
    body.style.cursor = "col-resize";
    body.style.userSelect = "none";
    setDragging(true);
    const move = (event: MouseEvent) => {
      if (event.buttons === 0) {
        stopDrag();
        return;
      }
      devtools.setSidebarWidth(startWidth + event.clientX - startX);
    };
    stopDrag = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("blur", stopDrag);
      body.style.cursor = previousCursor;
      body.style.userSelect = previousSelection;
      setDragging(false);
      stopDrag = () => {};
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("blur", stopDrag);
  }

  return (
    <div
      class="devtools-sidebar-divider"
      classList={{ "is-dragging": dragging() }}
      role="separator"
      aria-label="Sidebar width"
      aria-orientation="vertical"
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      aria-valuenow={devtools.layout().sidebarWidth}
      tabIndex={0}
      onMouseDown={startDrag}
      onKeyDown={event => {
        const width = devtools.layout().sidebarWidth;
        const next = event.key === "ArrowLeft" ? width - 10
          : event.key === "ArrowRight" ? width + 10
          : event.key === "Home" ? SIDEBAR_MIN_WIDTH
          : event.key === "End" ? SIDEBAR_MAX_WIDTH : undefined;
        if (next !== undefined) {
          event.preventDefault();
          devtools.setSidebarWidth(next);
        }
      }}
    />
  );
};

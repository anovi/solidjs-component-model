import { onMount, createEffect, For, Show, type Component } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";
import { createDevtoolsState } from "../hooks/useDevtoolsState";

export interface DevtoolsPanelProps {
  client?: ApiClient<ComponentModelDevToolsApi>;
  autoFetch?: boolean;
  class?: string;
}

/**
 * Devtools Panel UI SolidJS Component.
 * Interacts with the inspected application via an ApiClient.
 */
export const DevtoolsPanel: Component<DevtoolsPanelProps> = props => {
  const state = createDevtoolsState(props.client);
  let logContainerRef: HTMLPreElement | null = null;

  onMount(() => {
    if (props.autoFetch !== false) {
      state.refresh().catch(() => {
        // Handled in state
      });
    }
  });

  createEffect(() => {
    // Auto-scroll when logs change
    state.logs();
    if (logContainerRef) {
      logContainerRef.scrollTop = logContainerRef.scrollHeight;
    }
  });

  return (
    <div class={`devtools-panel-root ${props.class ?? ""}`}>
      <div class="devtools-panel-header">
        <h2>Inspector Panel</h2>
        <p>Communicating directly with application models via RPC</p>
      </div>

      <div class="devtools-panel-toolbar">
        <button
          class="devtools-btn devtools-btn-primary"
          disabled={state.loading()}
          onClick={() => state.refresh()}
        >
          {state.loading() ? "Fetching..." : "Fetch Models"}
        </button>
        <button
          class="devtools-btn devtools-btn-secondary"
          onClick={() => state.clearLog()}
        >
          Clear Log
        </button>
      </div>

      <Show when={state.models().length > 0}>
        <div class="devtools-models-preview">
          <span class="devtools-models-label">
            Discovered Models ({state.models().length}):
          </span>
          <div class="devtools-models-tags">
            <For each={state.models()}>
              {id => <code class="devtools-model-tag">{id}</code>}
            </For>
          </div>
        </div>
      </Show>

      <pre ref={el => (logContainerRef = el)} class="devtools-log-viewer">
        <Show
          when={state.logs().length > 0}
          fallback={
            <span class="devtools-log-empty">
              No logs yet. Click "Fetch Models" to inspect.
            </span>
          }
        >
          <For each={state.logs()}>
            {entry => (
              <div class={`log-line log-${entry.type}`}>
                <span class="log-time">[{entry.time}]</span>{" "}
                <span class="log-msg">{entry.message}</span>
              </div>
            )}
          </For>
        </Show>
      </pre>

      <style>{`
        .devtools-panel-root {
          background-color: #18181b;
          border: 1px solid #2e2e38;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #f4f4f5;
        }
        .devtools-panel-header {
          margin-bottom: 16px;
        }
        .devtools-panel-header h2 {
          margin: 0 0 6px;
          font-size: 16px;
          font-weight: 600;
        }
        .devtools-panel-header p {
          margin: 0;
          font-size: 12px;
          color: #a1a1aa;
        }
        .devtools-panel-toolbar {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .devtools-btn {
          background: #3f3f46;
          color: #fff;
          border: none;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: background-color 0.15s ease;
        }
        .devtools-btn:hover:not(:disabled) {
          background: #52525b;
        }
        .devtools-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .devtools-btn-primary {
          background: #3b82f6;
        }
        .devtools-btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }
        .devtools-models-preview {
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 12px;
          font-size: 12px;
        }
        .devtools-models-label {
          color: #a1a1aa;
          margin-right: 8px;
          font-weight: 500;
        }
        .devtools-models-tags {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }
        .devtools-model-tag {
          background: #18181b;
          border: 1px solid #3f3f46;
          color: #93c5fd;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-family: ui-monospace, monospace;
        }
        .devtools-log-viewer {
          background: #121214;
          border: 1px solid #2e2e38;
          border-radius: 6px;
          padding: 12px;
          flex: 1;
          min-height: 250px;
          max-height: 450px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
          line-height: 1.6;
          margin: 0;
        }
        .devtools-log-empty {
          color: #71717a;
          font-style: italic;
        }
        .log-line {
          margin-bottom: 2px;
        }
        .log-time {
          color: #71717a;
        }
        .log-info .log-msg { color: #93c5fd; }
        .log-warn .log-msg { color: #fde047; }
        .log-error .log-msg { color: #f87171; }
      `}</style>
    </div>
  );
};

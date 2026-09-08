import { For, Show, type Component } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";
import { DevtoolsPanel } from "../src/panel";
import type { ParentAppModel, SettingsModel } from "./models";

export interface DemoAppProps {
  client: ApiClient<ComponentModelDevToolsApi>;
  parentModel: InstanceType<typeof ParentAppModel>;
  settingsModel: InstanceType<typeof SettingsModel>;
}

export const App: Component<DemoAppProps> = props => {
  const { parentModel, settingsModel } = props;

  return (
    <div class="demo-page">
      <header class="demo-header">
        <div class="header-title">
          <h1>Solid Component Model DevTools</h1>
          <span class="badge-transport">Transport: Local (In-Memory)</span>
        </div>
      </header>

      <main class="demo-layout">
        {/* Left column: Inspected Application */}
        <section class="demo-section">
          <div class="section-title">Inspected Application</div>

          <div class="card">
            <h3>Parent Model: {parentModel.data.appName}</h3>
            <div class="meta-info">
              <div>
                <strong>Model ID:</strong> <code>{parentModel._id}</code>
              </div>
              <div>
                <strong>Total Clicks:</strong>{" "}
                <span class="badge">{parentModel.data.totalClicks}</span>
              </div>
              <div>
                <strong>Active Children:</strong>{" "}
                <span class="badge">{parentModel.data.children.length}</span>
              </div>
            </div>
            <div class="parent-actions">
              <button
                class="btn btn-primary"
                onClick={() => parentModel.addChild()}
              >
                + Add Child Model
              </button>
              <button
                class="btn btn-secondary"
                onClick={() => parentModel.incrementAll()}
              >
                Increment All Children
              </button>
            </div>
          </div>

          <div class="card">
            <h3>Children Models (Hierarchy)</h3>
            <div class="children-list">
              <Show
                when={parentModel.data.children.length > 0}
                fallback={
                  <p class="empty-state">
                    No children models alive. Click "Add Child Model" above.
                  </p>
                }
              >
                <For each={parentModel.data.children}>
                  {child => (
                    <div class="child-card">
                      <div class="child-header">
                        <strong>{child.data.title}</strong>
                        <span class="badge">
                          ID: {child._id.slice(0, 8)}...
                        </span>
                        <button
                          class="btn btn-sm btn-danger"
                          onClick={() => parentModel.removeChild(child._id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div class="child-body">
                        <span class="count-value">
                          Count: <strong>{child.data.count}</strong>
                        </span>
                        <span class="child-status">{child.data.status}</span>
                        <div class="btn-group">
                          <button
                            class="btn btn-sm"
                            onClick={() => child.increment()}
                          >
                            +1
                          </button>
                          <button
                            class="btn btn-sm"
                            onClick={() => child.decrement()}
                          >
                            -1
                          </button>
                          <button
                            class="btn btn-sm"
                            onClick={() => child.reset()}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>

          <div class="card">
            <h3>Standalone Model: Settings</h3>
            <div class="meta-info">
              <div>
                <strong>Theme:</strong>{" "}
                <span class="badge">{settingsModel.data.theme}</span>
              </div>
              <div>
                <strong>Model ID:</strong> <code>{settingsModel._id}</code>
              </div>
            </div>
            <div class="parent-actions">
              <button
                class="btn btn-secondary"
                onClick={() => settingsModel.toggleTheme()}
              >
                Toggle Theme ({settingsModel.data.theme})
              </button>
            </div>
          </div>
        </section>

        {/* Right column: DevTools Panel Widget (No markup owned by demo app) */}
        <section class="demo-section">
          <div class="section-title">DevTools Panel</div>
          <DevtoolsPanel client={props.client} autoFetch={true} />
        </section>
      </main>

      <style>{`
        :root {
          --bg-dark: #121214;
          --bg-card: #1e1e24;
          --bg-panel: #18181b;
          --border-color: #2e2e38;
          --text-main: #f4f4f5;
          --text-muted: #a1a1aa;
          --primary: #3b82f6;
          --primary-hover: #2563eb;
          --secondary: #3f3f46;
          --secondary-hover: #52525b;
          --danger: #ef4444;
          --danger-hover: #dc2626;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: var(--bg-dark);
          color: var(--text-main);
          min-height: 100vh;
        }

        .demo-page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .demo-header {
          padding: 14px 24px;
          background-color: var(--bg-panel);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title h1 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .badge-transport {
          background: #064e3b;
          color: #34d399;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 9999px;
          font-weight: 500;
        }

        .demo-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          padding: 24px;
          flex: 1;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 900px) {
          .demo-layout {
            grid-template-columns: 1fr;
          }
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin: 0 0 16px 0;
        }

        .card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .card h3 {
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: 600;
        }

        .meta-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 14px;
        }

        .meta-info code {
          background: #27272a;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          color: #e4e4e7;
        }

        .badge {
          background: var(--secondary);
          color: #e4e4e7;
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .btn {
          background: var(--secondary);
          color: #fff;
          border: none;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: background-color 0.15s ease;
        }

        .btn:hover {
          background: var(--secondary-hover);
        }

        .btn-primary {
          background: var(--primary);
        }

        .btn-primary:hover {
          background: var(--primary-hover);
        }

        .btn-danger {
          background: var(--danger);
        }

        .btn-danger:hover {
          background: var(--danger-hover);
        }

        .btn-sm {
          padding: 4px 10px;
          font-size: 12px;
        }

        .parent-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .children-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .child-card {
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          padding: 12px;
        }

        .child-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .child-body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
        }

        .child-status {
          color: var(--text-muted);
          font-size: 12px;
        }

        .btn-group {
          display: flex;
          gap: 6px;
        }

        .empty-state {
          color: var(--text-muted);
          font-size: 13px;
          font-style: italic;
          margin: 8px 0;
        }
      `}</style>
    </div>
  );
};

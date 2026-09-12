import { For, Show, type Component } from "solid-js";
import type { ApiClient } from "@solid-component-model/rpc";
import { DevtoolsPanel, ApiClientContext, createLogsStore, createDevtoolsState } from "../src/panel";
import type { ParentAppModel, SettingsModel } from "./models";
import './styles.css';


export interface DemoAppProps {
  client: ApiClient;
  parentModel: InstanceType<typeof ParentAppModel>;
  settingsModel: InstanceType<typeof SettingsModel>;
}

export const App: Component<DemoAppProps> = props => {
  const { parentModel, settingsModel } = props;
  const logger = createLogsStore();

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
                onClick={() => parentModel.dispatch({type: 'ADD_CHILD'})}
              >
                + Add Child Model
              </button>
              <button
                class="btn btn-secondary"
                onClick={() => parentModel.dispatch({ type: 'INCREMENT_ALL'})}
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
                          onClick={() => parentModel.dispatch({type: 'REMOVE_CHILD', id: child._id})}
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
          <ApiClientContext.Provider value={{ client: props.client, logger, devtools: createDevtoolsState(props.client, logger) }}>
            <DevtoolsPanel client={props.client} />
          </ApiClientContext.Provider>
        </section>
      </main>
    </div>
  );
};

import { render } from "solid-js/web";
import type { ApiClient } from "@solid-component-model/rpc";
import { DevtoolsPanel } from "./components/DevtoolsPanel";
import { LogsStore } from "./stores/logs";
import { ApiClientContext } from "./context";
import { createDevtoolsState } from "./hooks/useDevtoolsState";

export interface PanelAppConfig {
  client: ApiClient;
  logger: LogsStore;
  container?: HTMLElement;
}

export interface PanelAppInstance {
  client: ApiClient;
  dispose: () => void;
}

/**
 * Creates and mounts the DevTools SolidJS panel application into a DOM container.
 */
export function createPanelApp(config: PanelAppConfig): PanelAppInstance {
  const container =
    config.container ??
    (typeof document !== "undefined" ? document.body : undefined);
  if (!container)
    throw new Error("No container element provided to createPanelApp");

  const dispose = render(
    () => (
      <ApiClientContext.Provider
        value={{
          client: config.client,
          logger: config.logger,
          devtools: createDevtoolsState(config.client, config.logger),
        }}
      >
        <DevtoolsPanel client={config.client} />
      </ApiClientContext.Provider>
    ),
    container
  );

  return {
    client: config.client,
    dispose: () => {
      dispose();
    },
  };
}

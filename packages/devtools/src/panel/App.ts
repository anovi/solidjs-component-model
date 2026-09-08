import type { ApiClient } from "@solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";
import { setApiClient } from "./context";
import { DevtoolsPanel } from "./components/DevtoolsPanel";

export interface PanelAppConfig {
  client: ApiClient<ComponentModelDevToolsApi>;
  container?: HTMLElement;
}

/**
 * Creates and mounts the DevTools panel application given an ApiClient.
 */
export function createPanelApp(config: PanelAppConfig): DevtoolsPanel {
  setApiClient(config.client);
  const container =
    config.container ??
    (typeof document !== "undefined" ? document.body : undefined);

  return new DevtoolsPanel({
    client: config.client,
    container,
  });
}

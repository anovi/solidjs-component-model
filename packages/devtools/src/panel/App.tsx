import { render } from "solid-js/web";
import type { ApiClient } from "@solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";
import { DevtoolsPanel } from "./components/DevtoolsPanel";

export interface PanelAppConfig {
  client: ApiClient<ComponentModelDevToolsApi>;
  container?: HTMLElement;
  autoFetch?: boolean;
}

export interface PanelAppInstance {
  client: ApiClient<ComponentModelDevToolsApi>;
  dispose: () => void;
}

/**
 * Creates and mounts the DevTools SolidJS panel application into a DOM container.
 */
export function createPanelApp(config: PanelAppConfig): PanelAppInstance {
  const container =
    config.container ??
    (typeof document !== "undefined" ? document.body : undefined);

  if (!container) {
    throw new Error("No container element provided to createPanelApp");
  }

  const dispose = render(
    () => (
      <DevtoolsPanel
        client={config.client}
        autoFetch={config.autoFetch ?? true}
      />
    ),
    container
  );

  return {
    client: config.client,
    dispose,
  };
}

import type {
  ApiHandlers,
  ApiServer,
  ApiServerOptions,
} from "@solid-component-model/rpc";

/**
 * Global context exposed by the ComponentModel DevTools integration.
 */
export interface GlobalDevContext {
  /**
   * Devtools ApiServer instance used by DevTools to inspect and monitor models in MAIN world.
   */
  __COMPONENT_MODEL_DEVTOOLS__?: ApiServer<ComponentModelDevToolsApi>;

  /**
   * Factory function for creating the DevTools ApiServer.
   */
  __COMPONENT_MODEL_DEVTOOLS_FACTORY__?: (
    initialHandlers: Partial<ApiHandlers<ComponentModelDevToolsApi>>,
    options?: ApiServerOptions
  ) => ApiServer<ComponentModelDevToolsApi>;

  /**
   * Function to synchronously create/initialize DevTools.
   */
  __CREATE_COMPONENT_MODEL_DEVTOOLS__?: (
    factory?: ComponentModelDevToolsServerFactory
  ) => void;

  /**
   * Indicates whether ComponentModel DevTools integration is enabled.
   */
  __COMPONENT_MODEL_DEVMODE__?: boolean;
}

export type ComponentModelDevToolsServerFactory = (
  initialHandlers: Partial<ApiHandlers<ComponentModelDevToolsApi>>,
  options?: ApiServerOptions
) => ApiServer<ComponentModelDevToolsApi>;

/**
 * API definition exposed by the inspected application in the MAIN world to DevTools.
 *
 * Provides APIs for discovering and inspecting live ComponentModel instances,
 * subscribing to model changes, and receiving state-machine events.
 */
export interface ComponentModelDevToolsApi {
  /**
   * Returns the version of the DevTools API.
   */
  version?: () => string;

  /**
   * Returns IDs or information about all currently alive models.
   */
  getModels: () => string[];

  /**
   * Returns snapshots of all live models.
   */
  getAllSnapshots?: () => Record<string, unknown>;
}

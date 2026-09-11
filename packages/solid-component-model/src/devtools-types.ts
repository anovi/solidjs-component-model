import type { ApiServer } from "@solid-component-model/rpc";
import { AnyComponentModel } from "./component-model";

/**
 * Global context exposed by the ComponentModel DevTools integration.
 */
export interface GlobalDevContext {
  /**
   * Devtools ApiServer instance used by DevTools to inspect and monitor models in MAIN world.
   */
  __COMPONENT_MODEL_DEVTOOLS__?: ApiServer;

  /**
   * Factory function for creating the DevTools ApiServer.
   */
  __COMPONENT_MODEL_DEVTOOLS_FACTORY__?: ComponentModelDevToolsServerFactory;

  /**
   * Function to synchronously create/initialize DevTools.
   */
  __CREATE_COMPONENT_MODEL_DEVTOOLS__?: (
    aliveModels: Map<string, AnyComponentModel>,
    factory: ComponentModelDevToolsServerFactory
  ) => ApiServer;

  /**
   * Indicates whether ComponentModel DevTools integration is enabled.
   */
  __COMPONENT_MODEL_DEVMODE__?: boolean;
}

export type ComponentModelDevToolsServerFactory = () => ApiServer;

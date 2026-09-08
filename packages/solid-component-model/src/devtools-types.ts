import type {
  ApiHandlers,
  ApiServer,
  ApiServerOptions,
} from "@solid-component-model/rpc";
import type { Status } from "./types";

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
   * Indicates whether ComponentModel DevTools integration is enabled.
   */
  __COMPONENT_MODEL_DEVMODE__?: boolean;
}

/**
 * Information about a ComponentModel instance available to DevTools.
 */
export interface ModelInfo {
  /** Unique identifier of the model. */
  id: string;

  /** Name of the model, typically its constructor name. */
  name: string;

  /** ID of the parent model, if any. */
  parentId?: string;

  /** IDs of the model's currently alive children. */
  childrenIds: string[];

  /** Current state of the model. */
  state: string;

  /** Current lifecycle status of the model. */
  status: Status;
}

/**
 * A model and its descendants represented as a tree.
 */
export interface ModelTreeNode extends ModelInfo {
  /** Child models nested under this model. */
  children: ModelTreeNode[];
}

/**
 * Types of events emitted by the DevTools server.
 */
export type DevToolsEventType = "start" | "stop" | "snapshot" | "transition";

/**
 * An event recorded by the DevTools server.
 */
export interface DevToolsEvent {
  /** Monotonically increasing event ID. */
  id: number;

  /** Type of the event. */
  type: DevToolsEventType;

  /** ID of the model associated with the event. */
  modelId: string;

  /** Time at which the event occurred, in milliseconds since Unix epoch. */
  timestamp: number;

  /** Model snapshot associated with the event, when available. */
  snapshot?: unknown;

  /** State before the transition, for transition events. */
  from?: string;

  /** State after the transition, for transition events. */
  to?: string;
}

export type ComponentModelDevToolsServerFactory = (
  initialHandlers: Partial<ApiHandlers<ComponentModelDevToolsApi>>,
  options?: ApiServerOptions
) => ApiServer<ComponentModelDevToolsApi>;

export type ComponentModelDevToolsBridgeFactory =
  ComponentModelDevToolsServerFactory;

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

/**
 * Backwards compatibility alias for ComponentModelDevToolsApi.
 */
export type ComponentModelDevToolsBridge = ComponentModelDevToolsApi;

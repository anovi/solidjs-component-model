import type { AnyComponentModel } from "./component-model";
import type { Status } from "./types";

/**
 * Global context exposed by the ComponentModel DevTools integration.
 */
export interface GlobalDevContext {
  /**
   * Bridge used by the DevTools panel to inspect and monitor models.
   */
  __COMPONENT_MODEL_DEVTOOLS__: ComponentModelDevToolsBridge;

  /**
   * Indicates whether ComponentModel DevTools integration is enabled.
   */
  __COMPONENT_MODEL_DEVMODE__: boolean;
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
 * Types of events emitted by the DevTools bridge.
 */
export type DevToolsEventType = "start" | "stop" | "snapshot" | "transition";

/**
 * An event recorded by the DevTools bridge.
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

/**
 * Bridge between the inspected application and the ComponentModel DevTools.
 *
 * Provides APIs for discovering and inspecting live ComponentModel instances,
 * subscribing to model changes, and receiving state-machine events.
 */
export interface ComponentModelDevToolsBridge {
  /**
   * Version of the DevTools bridge API.
   */
  readonly version: string;

  /**
   * Returns information about all currently alive models.
   */
  getModels: () => ModelInfo[];

  /**
   * Returns all currently alive models as a hierarchical tree.
   */
  getModelTree: () => ModelTreeNode[];

  /**
   * Returns the current snapshot of a model.
   *
   * The snapshot is obtained by calling `model.toJSON()`.
   *
   * @param modelId ID of the model to inspect.
   * @returns The model snapshot, or `undefined` if the model is not alive.
   */
  getSnapshot: (modelId: string) => unknown;

  /**
   * Returns the current snapshots of all alive models.
   *
   * The returned object is keyed by model ID.
   */
  getAllSnapshots: () => Record<string, unknown>;

  /**
   * Subscribes to snapshot changes for a model.
   *
   * @param modelId ID of the model to subscribe to.
   * @param callback Called with the latest snapshot whenever it changes.
   * @returns A function that unsubscribes the callback.
   */
  subscribe: (
    modelId: string,
    callback: (snapshot: unknown) => void
  ) => () => void;

  /**
   * Subscribes to changes in the model tree.
   *
   * @param callback Called with the current list of models whenever the tree changes.
   * @returns A function that unsubscribes the callback.
   */
  subscribeTree: (callback: (models: ModelInfo[]) => void) => () => void;

  /**
   * Checks whether a model is currently alive.
   *
   * @param modelId ID of the model to check.
   */
  isAlive: (modelId: string) => boolean;

  /**
   * Returns the current DevTools revision.
   *
   * The revision is incremented whenever the DevTools state changes.
   */
  getRevision: () => number;

  /**
   * Returns all events that occurred after the specified event ID.
   *
   * @param lastEventId Only events with an ID greater than this value are returned.
   */
  getEventsSince: (lastEventId: number) => DevToolsEvent[];

  /**
   * Registers a ComponentModel with the DevTools bridge.
   *
   * This is an internal API used by ComponentModel.
   *
   * @param model Model to register.
   */
  __registerModel: (model: AnyComponentModel) => void;

  /**
   * Unregisters a ComponentModel from the DevTools bridge.
   *
   * This is an internal API used by ComponentModel.
   *
   * @param model Model to unregister.
   */
  __unregisterModel: (model: AnyComponentModel) => void;

  /**
   * Reports a new snapshot for a model.
   *
   * This is an internal API used by ComponentModel.
   *
   * @param model Model whose snapshot changed.
   * @param snapshot New model snapshot.
   */
  __notifySnapshot: (model: AnyComponentModel, snapshot: unknown) => void;

  /**
   * Reports a state-machine transition.
   *
   * This is an internal API used by ComponentModel.
   *
   * @param model Model that transitioned.
   * @param from Previous state.
   * @param to New state.
   */
  __notifyTransition: (
    model: AnyComponentModel,
    from: string,
    to: string
  ) => void;
}

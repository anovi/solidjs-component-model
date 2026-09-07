import type { AnyComponentModel } from "./component-model";
import type {
  ComponentModelDevToolsBridge,
  ModelInfo,
  ModelTreeNode,
  DevToolsEvent,
  DevToolsEventType,
} from "./devtools-types";

export * from "./devtools-types";

/**
 * Creates a DevTools bridge for inspecting live ComponentModel instances.
 *
 * @param aliveModels Map of currently alive ComponentModel instances keyed by ID.
 * @param modelChildrenMap Map of model IDs to their child models.
 * @returns A ComponentModel DevTools bridge.
 */
export function createDevToolsBridge(
  aliveModels: Map<string, AnyComponentModel>,
  modelChildrenMap: Map<string, AnyComponentModel[]>
): ComponentModelDevToolsBridge {
  let revision = 0;
  let nextEventId = 1;
  const maxEvents = 1000;
  const events: DevToolsEvent[] = [];
  const treeSubscribers = new Set<(models: ModelInfo[]) => void>();
  const modelSubscribers = new Map<string, Set<(snapshot: unknown) => void>>();

  function pushEvent(
    type: DevToolsEventType,
    modelId: string,
    snapshot?: unknown,
    from?: string,
    to?: string
  ): void {
    revision++;
    const event: DevToolsEvent = {
      id: nextEventId++,
      type,
      modelId,
      timestamp: Date.now(),
      snapshot,
      from,
      to,
    };
    events.push(event);
    if (events.length > maxEvents) {
      events.shift();
    }
  }

  function notifyTreeChange(): void {
    if (treeSubscribers.size === 0) return;
    const models = getModels();
    for (const callback of treeSubscribers) {
      try {
        callback(models);
      } catch (err) {
        console.error("DevTools tree subscriber error:", err);
      }
    }
  }

  function getModels(): ModelInfo[] {
    const list: ModelInfo[] = [];
    for (const [id, model] of aliveModels.entries()) {
      // Find parent if alive
      let parentId: string | undefined;
      // @ts-ignore
      const parent = model.parent;
      if (parent && aliveModels.has(parent._id)) {
        parentId = parent._id;
      } else {
        // Fallback: check if this model is listed in any other model's children map
        for (const [pId, children] of modelChildrenMap.entries()) {
          if (aliveModels.has(pId) && children.some(ch => ch._id === id)) {
            parentId = pId;
            break;
          }
        }
      }

      // Collect children that are still alive
      const rawChildren = modelChildrenMap.get(id) || [];
      const childrenIdsSet = new Set<string>();
      for (const ch of rawChildren) {
        if (aliveModels.has(ch._id)) {
          childrenIdsSet.add(ch._id);
        }
      }
      // Also check models whose .parent points to this model
      for (const [otherId, otherModel] of aliveModels.entries()) {
        // @ts-ignore
        const parent = otherModel.parent;
        if (parent && parent._id === id) {
          childrenIdsSet.add(otherId);
        }
      }

      const name = model.constructor?.name || "ComponentModel";
      const state = typeof model.state === "function" ? model.state() : "";
      const status = model.status;

      list.push({
        id,
        name,
        parentId,
        childrenIds: Array.from(childrenIdsSet),
        state,
        status,
      });
    }
    return list;
  }

  function getModelTree(): ModelTreeNode[] {
    const models = getModels();
    const nodeMap = new Map<string, ModelTreeNode>();

    for (const m of models) {
      nodeMap.set(m.id, {
        ...m,
        children: [],
      });
    }

    const roots: ModelTreeNode[] = [];

    for (const m of models) {
      const node = nodeMap.get(m.id)!;
      if (m.parentId && nodeMap.has(m.parentId)) {
        const parentNode = nodeMap.get(m.parentId)!;
        if (!parentNode.children.some(ch => ch.id === node.id)) {
          parentNode.children.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  function getSnapshot(modelId: string): unknown {
    const model = aliveModels.get(modelId);
    if (!model) return undefined;
    return model.toJSON();
  }

  function getAllSnapshots(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [id, model] of aliveModels.entries()) {
      result[id] = model.toJSON();
    }
    return result;
  }

  function subscribe(
    modelId: string,
    callback: (snapshot: unknown) => void
  ): () => void {
    let subscribers = modelSubscribers.get(modelId);
    if (!subscribers) {
      subscribers = new Set();
      modelSubscribers.set(modelId, subscribers);
    }
    subscribers.add(callback);

    const model = aliveModels.get(modelId);
    let modelSub: { unsubscribe: () => void } | undefined;
    if (model) {
      modelSub = model.subscribe({
        next: snapshot => {
          callback(snapshot);
        },
      });
    }

    return () => {
      const subs = modelSubscribers.get(modelId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          modelSubscribers.delete(modelId);
        }
      }
      modelSub?.unsubscribe();
    };
  }

  function subscribeTree(callback: (models: ModelInfo[]) => void): () => void {
    treeSubscribers.add(callback);
    return () => {
      treeSubscribers.delete(callback);
    };
  }

  function isAlive(modelId: string): boolean {
    return aliveModels.has(modelId);
  }

  function getRevision(): number {
    return revision;
  }

  function getEventsSince(lastEventId: number): DevToolsEvent[] {
    return events.filter(e => e.id > lastEventId);
  }

  function __registerModel(model: AnyComponentModel): void {
    pushEvent("start", model._id, model.toJSON());
    notifyTreeChange();
  }

  function __unregisterModel(model: AnyComponentModel): void {
    pushEvent("stop", model._id);
    notifyTreeChange();
  }

  function __notifySnapshot(model: AnyComponentModel, snapshot: unknown): void {
    pushEvent("snapshot", model._id, snapshot);
    const subs = modelSubscribers.get(model._id);
    if (subs) {
      for (const cb of subs) {
        try {
          cb(snapshot);
        } catch (err) {
          console.error("DevTools model subscriber error:", err);
        }
      }
    }
  }

  function __notifyTransition(
    model: AnyComponentModel,
    from: string,
    to: string
  ): void {
    pushEvent("transition", model._id, undefined, from, to);
    notifyTreeChange();
  }

  return {
    version: "1.0.0",
    getModels,
    getModelTree,
    getSnapshot,
    getAllSnapshots,
    subscribe,
    subscribeTree,
    isAlive,
    getRevision,
    getEventsSince,
    __registerModel,
    __unregisterModel,
    __notifySnapshot,
    __notifyTransition,
  };
}

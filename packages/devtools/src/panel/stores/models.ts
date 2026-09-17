import { AnyModelData, Status } from "solid-component-model";
import { createStore, reconcile } from "solid-js/store";

export type ModelSnapshot = {
  _id: string;
  chartId?: string;
  parentId?: string;
  name: string;
  state: string;
  data: AnyModelData;
  status: Status;
  childrenIds?: string[];
};

export type ModelsStore = {
  models: ModelSnapshot[];
  addModel: (model: ModelSnapshot) => void;
  removeModel: (modelId: string) => void;
  updateModel: (model: ModelSnapshot) => void;
};

const [store, setStore] = createStore<{ models: ModelSnapshot[] }>({
  models: [],
});

export const models = store;

export function createModelsStore(): ModelsStore {
  return {
    get models() {
      return store.models;
    },

    addModel: (model: ModelSnapshot) => {
      setStore("models", store.models.length, model);
    },

    removeModel: (modelId: string) => {
      setStore("models", models => models.filter(m => m._id !== modelId));
    },

    updateModel: (model: ModelSnapshot) => {
      setStore("models", m => m._id === model._id, reconcile(model));
    },
  };
}

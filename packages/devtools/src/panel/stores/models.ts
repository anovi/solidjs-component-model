import { AnyModelData, Status } from "solid-component-model";
import { createStore } from "solid-js/store";

export type ModelSnapshot = {
  _id: string;
  name: string;
  state: string;
  data: AnyModelData;
  status: Status;
};

export type ModelsStore = {
  models: ModelSnapshot[];
  addModel: (model: ModelSnapshot) => void;
  removeModel: (modelId: string) => void;
  updateModel: (model: ModelSnapshot) => void;
};

export function createModelsStore(): ModelsStore {
  const [store, setStore] = createStore<{ models: ModelSnapshot[] }>({
    models: [],
  });

  return {
    models: store.models,

    addModel: (model: ModelSnapshot) => {
      setStore("models", store.models.length, model);
    },

    removeModel: (modelId: string) => {
      setStore(
        "models",
        store.models.filter(m => m._id !== modelId)
      );
    },

    updateModel: (model: ModelSnapshot) => {
      setStore(
        "models",
        m => m._id === model._id,
        () => model
      );
    },
  };
}

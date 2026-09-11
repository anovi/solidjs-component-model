import {
  type GlobalDevContext,
  ComponentModelDevToolsServerFactory,
  type AnyComponentModel,
} from "solid-component-model";
import { ApiServer } from "@solid-component-model/rpc";

export function createDevTools(
  aliveModels: Map<string, AnyComponentModel>,
  factory: ComponentModelDevToolsServerFactory
): ApiServer {
  console.log("create ApiServer");
  const globalObj = globalThis as unknown as GlobalDevContext;

  const devtools = factory();

  globalObj.__COMPONENT_MODEL_DEVTOOLS__ = devtools;

  devtools.onClientConnect(() => {
    console.log(" 🧡 connection request");
    for (const [id, model] of aliveModels.entries()) {
      void id;
      devtools.registerModel(model.toJSON());
    }
  });

  if (typeof window !== "undefined") {
    window.postMessage(
      {
        source: "scm-devtools",
        type: "COMPONENT_MODEL_DEVTOOLS_CREATED",
      },
      "*"
    );
  }

  return devtools;
}

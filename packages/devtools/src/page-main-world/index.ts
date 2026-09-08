import {
  type GlobalDevContext,
  type ComponentModelDevToolsApi,
} from "solid-component-model";
import { createMainWorldServer } from "../chrome";

console.log("Run content MAIN");
const globalObj = globalThis as unknown as GlobalDevContext;

globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__ = (handlers, options) =>
  createMainWorldServer<ComponentModelDevToolsApi>(handlers, options);

window.postMessage({ type: "CREATE_DEV_TOOLS", source: "scm-devtools" }, "*");

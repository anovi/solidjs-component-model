import { type GlobalDevContext } from "solid-component-model";
import { createMainWorldServer } from "./chrome";
import { createDevTools } from "./create-dev-tools";

const globalObj = globalThis as unknown as GlobalDevContext;

globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__ = () => createMainWorldServer();

globalObj.__CREATE_COMPONENT_MODEL_DEVTOOLS__ = createDevTools;

window.postMessage({ type: "CREATE_DEV_TOOLS", source: "scm-devtools" }, "*");

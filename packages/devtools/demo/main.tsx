import { render } from "solid-js/web";
import { createLocalPanelClient, createLocalServer } from "../src/local";
import { App } from "./App";
import { GlobalDevContext } from "solid-component-model";
import { createDevTools } from "../src";
import { parentModel, settingsModel } from "./create-models";

;

function initialize() {
  const globalObj = globalThis as unknown as GlobalDevContext;
  globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__ = () => createLocalServer();
  globalObj.__CREATE_COMPONENT_MODEL_DEVTOOLS__ = createDevTools;
  window.postMessage({ type: "CREATE_DEV_TOOLS", source: "scm-devtools" }, "*");
}

function start() {
  // Initialize local transport bridge
  const client = createLocalPanelClient()

  // Mount Demo SolidJS Application into #root
  const rootElement = document.getElementById("root");
  if (rootElement) {
    render(
      () => (
        <App
          client={client}
          parentModel={parentModel}
          settingsModel={settingsModel}
        />
      ),
      rootElement
    );
  }
}

window.addEventListener('message', (event) => {
  if (event.source === window && event.data?.source === "scm-devtools" && event.data.type === 'COMPONENT_MODEL_DEVTOOLS_CREATED') {
    start();
  }
});

initialize();
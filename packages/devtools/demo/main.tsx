import { render } from "solid-js/web";
import { createLocalPanelClient, createLocalServer } from "../src/local";
import { App } from "./App";
import { ParentAppModel, SettingsModel } from "./models";
import { GlobalDevContext } from "solid-component-model";
import { createDevTools } from "../src";



// 1. Instantiate and start models
const parentModel = new ParentAppModel();
parentModel.start();

const settingsModel = new SettingsModel();
settingsModel.start();

// Add initial children to demonstrate hierarchy
parentModel.addChild("Primary Counter");
parentModel.addChild("Secondary Counter");

function initialize() {
  const globalObj = globalThis as unknown as GlobalDevContext;
  globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__ = () => createLocalServer();
  globalObj.__CREATE_COMPONENT_MODEL_DEVTOOLS__ = createDevTools;
  window.postMessage({ type: "CREATE_DEV_TOOLS", source: "scm-devtools" }, "*");
}

function start() {
  // 2. Initialize local transport bridge
  const client = createLocalPanelClient()

  // 3. Mount Demo SolidJS Application into #root
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
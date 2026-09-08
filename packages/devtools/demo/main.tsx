import { render } from "solid-js/web";
import { attachLocalDevTools } from "../src/local";
import { App } from "./App";
import { ParentAppModel, SettingsModel } from "./models";

// 1. Initialize local transport bridge
const { client } = attachLocalDevTools();

// 2. Instantiate and start models
const parentModel = new ParentAppModel();
parentModel.start();

const settingsModel = new SettingsModel();
settingsModel.start();

// Add initial children to demonstrate hierarchy
parentModel.addChild("Primary Counter");
parentModel.addChild("Secondary Counter");

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

import { ParentAppModel, SettingsModel } from "./models";

// Instantiate and start models
export const parentModel = new ParentAppModel();
parentModel.start();

export const settingsModel = new SettingsModel();
settingsModel.start();

// Add initial children to demonstrate hierarchy
parentModel.addChild("Primary Counter");
parentModel.addChild("Secondary Counter");

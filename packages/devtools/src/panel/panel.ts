/// <reference types="chrome" />

import type { ComponentModelDevToolsApi } from "solid-component-model";
import { createChromePanelClient } from "../chrome";
import { createPanelApp } from "./App";

(async function bootstrap() {
  if (
    typeof chrome !== "undefined" &&
    chrome.devtools &&
    chrome.devtools.inspectedWindow
  ) {
    chrome.devtools.inspectedWindow.eval(`console.log("Run panel!")`);
    const tabId = chrome.devtools.inspectedWindow.tabId;

    const client = createChromePanelClient<ComponentModelDevToolsApi>({
      tabId,
    });

    if (chrome.scripting) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content-isolated.js"],
        world: "ISOLATED",
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content-main.js"],
        world: "MAIN",
      });
    }

    const container = document.getElementById("root") ?? document.body;

    createPanelApp({ client, container, autoFetch: true });
  }
})();

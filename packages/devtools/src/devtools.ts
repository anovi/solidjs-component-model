/// <reference types="chrome" />

import { createChromeDevToolsRelay } from "./chrome";

export {};

chrome.devtools.panels.create("My Panel", "", "panel.html", panel => {
  void panel;
});

const relay = createChromeDevToolsRelay();
void relay;

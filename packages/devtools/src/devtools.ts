/// <reference types="chrome" />

export {};

chrome.devtools.inspectedWindow.eval(`console.log("DEVTOOLS: starting")`);

chrome.devtools.panels.create("My Panel", "", "panel.html", panel => {
  void panel;
});

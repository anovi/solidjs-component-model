/// <reference types="chrome" />
export {};

chrome.devtools.panels.create("My Panel", "", "panel.html", panel => {
  void panel;
});

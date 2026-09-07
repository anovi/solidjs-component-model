/// <reference types="chrome" />

import { post } from "./injected_script";

export {};

declare const chrome: typeof window.chrome;

console.log("Running content-script.js");

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;

  const message = event.data as { source?: string; greeting?: string };
  if (
    typeof message !== "object" ||
    message === null ||
    message.source !== "my-devtools-extension"
  ) {
    return;
  }

  console.log("sending", message);

  chrome.runtime.sendMessage(message, (response: unknown) => {
    console.log("received user data", response);
  });
});

post();

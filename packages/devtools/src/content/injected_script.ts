/// <reference types="chrome" />
export {};

console.log("Running injected-script.js");

export function post() {
  window.postMessage(
    {
      greeting: "hello there!",
      source: "my-devtools-extension",
    },
    "*"
  );
}

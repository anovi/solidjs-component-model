// background.ts

console.log("service worker started");

chrome.runtime.onMessage.addListener((message, sender) => {
  console.log("message from content script", message, sender);
});

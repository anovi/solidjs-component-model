console.log("Run content ISOLATED");

chrome.runtime.onConnect.addListener(port => {
  // console.log('onConnect', port);
  if (port.name === "panel-page") {
    // Relay messages: Devtools --> Window
    port.onMessage.addListener((event: MessageEvent) => {
      window.postMessage(event);
    });

    function relay(event: MessageEvent) {
      port.postMessage(event.data);
    }

    // Relay messages: Window --> Devtools
    window.addEventListener("message", relay);

    port.onDisconnect.addListener(() => {
      console.log("📍Client gone");
      window.removeEventListener("message", relay);
      window.postMessage(
        { type: "CLIENT_DISCONNECTED", source: "scm-devtools" },
        "*"
      );
    });

    window.postMessage(
      { type: "CLIENT_CONNECTED", source: "scm-devtools" },
      "*"
    );
  }
});

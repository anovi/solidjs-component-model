/// <reference types="chrome" />
export {};

(function () {
  const logEl = document.getElementById("log") as HTMLPreElement | null;
  const triggerBtn = document.getElementById(
    "trigger"
  ) as HTMLButtonElement | null;
  const clearBtn = document.getElementById("clear") as HTMLButtonElement | null;

  type LogLevel = "info" | "warn" | "error";

  function append(level: LogLevel, text: string): void {
    if (!logEl) return;
    const line = document.createElement("div");
    line.className = "log-" + level;
    const ts = new Date().toLocaleTimeString();
    line.textContent = "[" + ts + "] " + text;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  chrome.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse: (response?: unknown) => void) => {
      const msg = message as { greeting?: string; source?: string };
      if (msg && typeof msg.greeting === "string") {
        append("info", "content-script: " + msg.greeting);
      }
      sendResponse("GOVNO");
    }
  );

  const tabId = chrome.devtools.inspectedWindow.tabId;

  void chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });

  triggerBtn?.addEventListener("click", () => {
    chrome.devtools.inspectedWindow.eval(
      'console.log("Hello from My Custom Panel at " + new Date().toISOString())'
    );
  });

  clearBtn?.addEventListener("click", () => {
    if (logEl) logEl.textContent = "";
  });

  append("info", "panel ready");
})();

import { ChromeLogger } from "./panel-client";

export class WindowConsoleChromeLogger implements ChromeLogger {
  log(message: string) {
    chrome.devtools.inspectedWindow.eval(
      `console.log("[DEVTOOL]: ${message}")`
    );
  }

  error(error: unknown) {
    chrome.devtools.inspectedWindow.eval(
      `console.error("[DEVTOOL]: ${error}")`
    );
  }

  warn(message: string) {
    chrome.devtools.inspectedWindow.eval(
      `console.warn("[DEVTOOL]: ${message}")`
    );
  }

  clear() {}
}

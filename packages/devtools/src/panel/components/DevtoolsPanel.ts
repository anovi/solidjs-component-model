import type { ApiClient } from "solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";
import {
  createDevtoolsState,
  type DevtoolsState,
} from "../hooks/useDevtoolsState";

export interface DevtoolsPanelOptions {
  client: ApiClient<ComponentModelDevToolsApi>;
  container?: HTMLElement;
}

/**
 * Devtools Panel UI component that interacts with the page via an ApiClient.
 * Fully decoupled from Chrome APIs and message passing internals.
 */
export class DevtoolsPanel {
  readonly client: ApiClient<ComponentModelDevToolsApi>;
  readonly state: DevtoolsState;
  private container: HTMLElement | null = null;
  private logElement: HTMLElement | null = null;

  constructor(options: DevtoolsPanelOptions) {
    this.client = options.client;
    this.state = createDevtoolsState(this.client);
    if (options.container) {
      this.mount(options.container);
    }
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.logElement = container.querySelector("#log") as HTMLElement | null;

    const triggerBtn = container.querySelector("#trigger");
    if (triggerBtn) {
      triggerBtn.addEventListener("click", () => {
        this.fetchModels();
      });
    }

    const clearBtn = container.querySelector("#clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        this.clearLog();
      });
    }
  }

  async fetchModels(): Promise<string[]> {
    this.appendLog("Fetching models from page...", "info");
    try {
      const models = await this.state.refresh();
      this.appendLog(`Received models: ${JSON.stringify(models)}`, "info");
      return models;
    } catch (err) {
      this.appendLog(`Error fetching models: ${String(err)}`, "error");
      return [];
    }
  }

  appendLog(message: string, type: "info" | "warn" | "error" = "info"): void {
    if (!this.logElement && this.container) {
      this.logElement = this.container.querySelector("#log");
    }
    if (this.logElement) {
      const text = `[${new Date().toLocaleTimeString()}] ${message}`;
      if (typeof document !== "undefined") {
        const line = document.createElement("div");
        line.className = `log-${type}`;
        line.textContent = text;
        this.logElement.appendChild(line);
      } else {
        this.logElement.appendChild({
          className: `log-${type}`,
          textContent: text,
        } as unknown as HTMLElement);
      }
      this.logElement.scrollTop = this.logElement.scrollHeight;
    }
  }

  clearLog(): void {
    if (this.logElement) {
      this.logElement.innerHTML = "";
    }
  }
}

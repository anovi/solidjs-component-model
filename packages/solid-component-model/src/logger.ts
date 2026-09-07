import { InternalEventName, type InternalEvent } from "./types";
import type { Event } from "./state-chart";

export interface Logger {
  event: (event: Event | InternalEvent) => void;
  transition: (from: string, to: string) => void;
  warning: (message: string) => void;
  group: (name: string, id: string) => void;
  groupEnd: () => void;
  error: (message: string, options?: { cause?: unknown }) => void;
  effectError: (
    type: "event" | "entry" | "exit",
    state: string,
    error: Error
  ) => void;
}

export class BrowserLogger implements Logger {
  event(event: Event | InternalEvent) {
    if (event.type === InternalEventName.InvokedError) {
      console.log(`Event: %c${event.type}`, "color: red", event);
      return;
    }
    console.log(`Event: %c${event.type}`, "color: green", event);
  }

  transition(from: string, to: string) {
    console.log(
      `Transition: ${from || "*"} → %c${to}`,
      "color: blue; font-weight: bold;"
    );
  }

  warning(message: string) {
    console.warn(message);
  }

  effectError(type: string, state: string, error: Error) {
    console.error(
      `%c${type} effect`,
      "color:red;font-weight:bold",
      `in "${state}" failed`,
      error
    );
  }

  group(name: string, id: string) {
    console.group(name, id);
  }

  groupEnd() {
    console.groupEnd();
  }

  error(message: string, options?: { cause?: unknown }) {
    void message;
    void options;
  }
}

export class TerminalLogger implements Logger {
  event(event: Event | InternalEvent): void {
    if (event.type === InternalEventName.InvokedError) {
      console.log(`Event: \x1b[31m${event.type}\x1b[0m`, event);
      return;
    }

    console.log(`Event: \x1b[32m${event.type}\x1b[0m`, event);
  }

  transition(from: string, to: string): void {
    console.log(`Transition: ${from || "*"} → \x1b[1;34m${to}\x1b[0m`);
  }

  warning(message: string): void {
    console.warn(`\x1b[33mWarning:\x1b[0m ${message}`);
  }

  effectError(
    type: "event" | "entry" | "exit",
    state: string,
    error: Error
  ): void {
    console.error(
      `\x1b[1;31m${type} effect\x1b[0m in "${state}" failed`,
      error
    );
  }

  group(name: string, id: string) {
    console.group(name, id);
  }

  groupEnd() {
    console.groupEnd();
  }

  error(message: string, options?: { cause?: unknown }) {
    void message;
    void options;
  }
}

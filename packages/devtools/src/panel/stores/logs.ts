import { createStore, Store } from "solid-js/store";

export interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: "info" | "warn" | "error";
}

export type LogsStore = {
  logs: Store<LogEntry[]>;
  log: (entry: string) => void;
  error: (error: string) => void;
  warn: (error: string) => void;
  clear: () => void;
};

let idCounter = 0;

function makeLogEntry(
  type: "info" | "warn" | "error",
  message: string
): LogEntry {
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3, // Ensures the .sss milliseconds part
  });
  return {
    type,
    message,
    id: idCounter++,
    time: timeString,
  };
}

export function createLogsStore(): LogsStore {
  const [store, setStore] = createStore<{ logs: LogEntry[] }>({ logs: [] });

  return {
    logs: store.logs,

    log: (message: string) => {
      setStore("logs", store.logs.length, makeLogEntry("info", message));
    },

    warn: (message: string) => {
      setStore("logs", store.logs.length, makeLogEntry("warn", message));
    },

    error: (message: string) => {
      setStore("logs", store.logs.length, makeLogEntry("error", message));
    },

    clear() {
      setStore("logs", []);
    },
  };
}

import { type InternalEvent } from "./types";
import type { Event } from "./state-chart";
export interface Logger {
    event: (event: Event | InternalEvent) => void;
    transition: (from: string, to: string) => void;
    warning: (message: string) => void;
    group: (name: string, id: string) => void;
    groupEnd: () => void;
    error: (message: string, options?: {
        cause?: unknown;
    }) => void;
    effectError: (type: 'event' | 'entry' | 'exit', state: string, error: Error) => void;
}
export declare class BrowserLogger implements Logger {
    event(event: Event | InternalEvent): void;
    transition(from: string, to: string): void;
    warning(message: string): void;
    effectError(type: string, state: string, error: Error): void;
    group(name: string, id: string): void;
    groupEnd(): void;
    error(message: string, options?: {
        cause?: unknown;
    }): void;
}
export declare class TerminalLogger implements Logger {
    event(event: Event | InternalEvent): void;
    transition(from: string, to: string): void;
    warning(message: string): void;
    effectError(type: 'event' | 'entry' | 'exit', state: string, error: Error): void;
    group(name: string, id: string): void;
    groupEnd(): void;
    error(message: string, options?: {
        cause?: unknown;
    }): void;
}
//# sourceMappingURL=logger.d.ts.map
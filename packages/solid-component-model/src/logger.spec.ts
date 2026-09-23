import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserLogger, TerminalLogger } from "./logger";
import { InternalEventName } from "./types";

describe.each([
  {
    name: "BrowserLogger",
    Logger: BrowserLogger,
    eventArgs: ["Event: %cSAVE", "color: green"],
    internalEventArgs: ["Event: %c@start", "color: green"],
    errorEventArgs: ["Event: %c@error.invoke", "color: red"],
    transitionArgs: [
      "Transition: idle → %cactive",
      "color: blue; font-weight: bold;",
    ],
    initialTransitionArgs: [
      "Transition: * → %cactive",
      "color: blue; font-weight: bold;",
    ],
    warningArgs: ["Unknown event"],
    effectArgs: (type: string) => [
      `%c${type} effect`,
      "color:red;font-weight:bold",
      'in "active" failed',
    ],
  },
  {
    name: "TerminalLogger",
    Logger: TerminalLogger,
    eventArgs: ["Event: \x1b[32mSAVE\x1b[0m"],
    internalEventArgs: ["Event: \x1b[32m@start\x1b[0m"],
    errorEventArgs: ["Event: \x1b[31m@error.invoke\x1b[0m"],
    transitionArgs: ["Transition: idle → \x1b[1;34mactive\x1b[0m"],
    initialTransitionArgs: ["Transition: * → \x1b[1;34mactive\x1b[0m"],
    warningArgs: ["\x1b[33mWarning:\x1b[0m Unknown event"],
    effectArgs: (type: string) => [
      `\x1b[1;31m${type} effect\x1b[0m in "active" failed`,
    ],
  },
])("$name", config => {
  let logger: BrowserLogger | TerminalLogger;

  beforeEach(() => {
    logger = new config.Logger();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "group").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a regular event in green with its original payload", () => {
    const event = { type: "SAVE", payload: { id: 42 } };

    logger.event(event);

    expect(console.log).toHaveBeenCalledExactlyOnceWith(
      ...config.eventArgs,
      event
    );
    expect(vi.mocked(console.log).mock.calls[0].at(-1)).toBe(event);
  });

  it("logs a non-error internal event in green", () => {
    const event = { type: InternalEventName.Start };

    logger.event(event);

    expect(console.log).toHaveBeenCalledExactlyOnceWith(
      ...config.internalEventArgs,
      event
    );
  });

  it("logs an invoked error event once in red", () => {
    const event = {
      type: InternalEventName.InvokedError,
      state: "active",
      error: new Error("Invocation failed"),
    };

    logger.event(event);

    expect(console.log).toHaveBeenCalledExactlyOnceWith(
      ...config.errorEventArgs,
      event
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs a transition with a bold blue destination", () => {
    logger.transition("idle", "active");

    expect(console.log).toHaveBeenCalledExactlyOnceWith(
      ...config.transitionArgs
    );
  });

  it("uses an asterisk when the transition has no source state", () => {
    logger.transition("", "active");

    expect(console.log).toHaveBeenCalledExactlyOnceWith(
      ...config.initialTransitionArgs
    );
  });

  it("logs warnings through console.warn", () => {
    logger.warning("Unknown event");

    expect(console.warn).toHaveBeenCalledExactlyOnceWith(...config.warningArgs);
  });

  it.each(["event", "entry", "exit"] as const)(
    "logs a failed %s effect with its state and original error",
    type => {
      const error = new Error("Effect failed");

      logger.effectError(type, "active", error);

      expect(console.error).toHaveBeenCalledExactlyOnceWith(
        ...config.effectArgs(type),
        error
      );
      expect(vi.mocked(console.error).mock.calls[0].at(-1)).toBe(error);
    }
  );

  it("opens a console group with the model name and id", () => {
    logger.group("Counter", "counter-1");

    expect(console.group).toHaveBeenCalledExactlyOnceWith(
      "Counter",
      "counter-1"
    );
  });

  it("closes the console group without arguments", () => {
    logger.groupEnd();

    expect(console.groupEnd).toHaveBeenCalledExactlyOnceWith();
  });

  it("currently leaves error reporting as a no-op with or without a cause", () => {
    logger.error("Something failed");
    logger.error("Something failed", {
      cause: new Error("Underlying failure"),
    });

    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(console.group).not.toHaveBeenCalled();
    expect(console.groupEnd).not.toHaveBeenCalled();
  });
});

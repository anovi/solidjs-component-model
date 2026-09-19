import { describe, expect, it, vi } from "vitest";
import { createApiServer, type ServerTransport } from "./index";

describe("ApiServer", () => {
  it("sends a model-added message when a model is registered", () => {
    const transport: ServerTransport = {
      send: vi.fn(),
      onConnected: vi.fn(),
      onDisonnected: vi.fn(),
      onMessage: vi.fn(() => ({ unsubscribe: vi.fn() })),
    };
    const server = createApiServer(transport);
    const snapshot = {
      _id: "model-1",
      name: "Counter",
      state: "idle",
      data: { count: 0 },
      status: "active" as const,
    };

    server.registerModel(snapshot);

    expect(transport.send).toHaveBeenCalledExactlyOnceWith({
      type: "MODEL_ADDED",
      snapshot,
    });
  });
});

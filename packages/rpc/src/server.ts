import { AnyModelData, Snapshot } from "solid-component-model";
import type { ApiServer as IApiServer, ServerTransport } from "./types";

export class ApiServer implements IApiServer {
  constructor(private transport: ServerTransport) {
    this.transport.onDisonnected(() => {
      console.log("⚠️ Client disconnected");
    });
  }

  onClientConnect(cb: () => void) {
    console.log("💻 Client connected");
    this.transport.onConnected(cb);
  }

  onClientDisconnect(cb: () => void) {
    this.transport.onDisonnected(cb);
  }

  registerModel(snapshot: Snapshot<string, AnyModelData>) {
    this.transport.send({ type: "MODEL_ADDED", snapshot });
  }

  unregisterModel(id: string) {
    this.transport.send({ type: "MODEL_REMOVED", id });
  }

  sendModelSnapshot(snapshot: Snapshot<string, AnyModelData>) {
    this.transport.send({ type: "SNAPSHOT", snapshot });
  }
}

export function createApiServer(transport: ServerTransport): ApiServer {
  return new ApiServer(transport);
}

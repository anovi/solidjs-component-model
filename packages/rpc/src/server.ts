import type { AnyModelData, StateChartDescriptor } from "solid-component-model";
import type { ApiServer as IApiServer, ServerTransport } from "./types";
import { InspectionSnapshot } from "../../solid-component-model/src/types";

export class ApiServer implements IApiServer {
  constructor(private transport: ServerTransport) {
    this.transport.onDisonnected(() => {
      console.log("[rpc server] client disconnected");
    });
    this.transport.onConnected(() => {
      console.log("[rpc server] client connected");
    });
  }

  onClientConnect(cb: () => void) {
    this.transport.onConnected(cb);
  }

  onClientDisconnect(cb: () => void) {
    this.transport.onDisonnected(cb);
  }

  registerModel(snapshot: InspectionSnapshot<string, AnyModelData>) {
    this.transport.send({ type: "MODEL_ADDED", snapshot });
  }

  registerChart(chart: StateChartDescriptor) {
    this.transport.send({ type: "REGISTER_CHART", chart });
  }

  unregisterModel(id: string) {
    this.transport.send({ type: "MODEL_REMOVED", id });
  }

  sendModelSnapshot(snapshot: InspectionSnapshot<string, AnyModelData>) {
    this.transport.send({ type: "SNAPSHOT", snapshot });
  }
}

export function createApiServer(transport: ServerTransport): ApiServer {
  return new ApiServer(transport);
}

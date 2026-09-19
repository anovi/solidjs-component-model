import type { AnyModelData, StateChartDescriptor } from "solid-component-model";
import type { ApiClient as IApiClient, ClientTransport } from "./types";
import { InspectionSnapshot } from "../../solid-component-model/src/types";

export class ApiClient implements IApiClient {
  constructor(private transport: ClientTransport) {}

  connect(): Promise<void> {
    return this.transport.connect().catch(error => {
      console.error("[client] connect failed", error);
      throw error;
    });
  }

  onConnected(cb: () => void) {
    this.transport.onConnected(() => {
      console.log("[rpc client] connected");
      cb();
    });
  }

  onDisconnected(cb: () => void) {
    this.transport.onDisonnected(() => {
      console.log("[rpc client] disconnected");
      cb();
    });
  }

  disconnect() {
    // this.transport.send({ type: '' })
  }

  onModelAdded(
    cb: (snapshot: InspectionSnapshot<string, AnyModelData>) => void
  ) {
    return this.transport.onMessage("MODEL_ADDED", message => {
      cb(message.snapshot);
    });
  }

  onModelRemoved(cb: (id: string) => void) {
    return this.transport.onMessage("MODEL_REMOVED", message => {
      cb(message.id);
    });
  }

  onModelUpdated(
    cb: (snapshot: InspectionSnapshot<string, AnyModelData>) => void
  ) {
    return this.transport.onMessage("SNAPSHOT", message => {
      cb(message.snapshot);
    });
  }

  onChartRegistered(cb: (chart: StateChartDescriptor) => void) {
    return this.transport.onMessage("REGISTER_CHART", message => {
      cb(message.chart);
    });
  }
}

export function createApiClient(transport: ClientTransport): ApiClient {
  return new ApiClient(transport);
}

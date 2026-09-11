import { AnyModelData, Snapshot } from "solid-component-model";
import type { ApiClient as IApiClient, ClientTransport } from "./types";

export class ApiClient implements IApiClient {
  constructor(private transport: ClientTransport) {}

  connect(): Promise<void> {
    return new Promise<void>(done => {
      // const sub = this.transport.onMessage('CONNECTED', () => {
      //   sub.unsubscribe();
      //   done();
      // });
      // this.transport.send({ type: 'CONNECT' });
      done();
    });
  }

  disconnect() {
    // this.transport.send({ type: '' })
  }

  onModelAdded(cb: (snapshot: Snapshot<string, AnyModelData>) => void) {
    this.transport.onMessage("MODEL_ADDED", message => {
      cb(message.snapshot);
    });
  }

  onModelRemoved(cb: (id: string) => void) {
    this.transport.onMessage("MODEL_REMOVED", message => {
      cb(message.id);
    });
  }

  onModelUpdated(cb: (snapshot: Snapshot<string, AnyModelData>) => void) {
    this.transport.onMessage("SNAPSHOT", message => {
      cb(message.snapshot);
    });
  }
}

export function createApiClient(transport: ClientTransport): ApiClient {
  return new ApiClient(transport);
}

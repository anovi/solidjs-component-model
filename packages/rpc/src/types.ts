import {
  AnyModelData,
  Snapshot,
  StateChartDescriptor,
} from "solid-component-model";

export type ApiClient = {
  connect: () => Promise<void>;
  disconnect: () => void;
  onModelAdded: (
    cb: (snapshot: Snapshot<string, AnyModelData>) => void
  ) => Subscription;
  onModelRemoved: (cb: (id: string) => void) => Subscription;
  onModelUpdated: (
    cb: (snapshot: Snapshot<string, AnyModelData>) => void
  ) => Subscription;
  onChartRegistered: (cb: (chart: StateChartDescriptor) => void) => void;
};
export type ApiServer = {
  onClientConnect: (cb: () => void) => void;
  onClientDisconnect: (cb: () => void) => void;
  registerModel: (snapshot: Snapshot<string, AnyModelData>) => void;
  // StateChart<AnyModel, Event, AnyStateChartConfig>
  registerChart: (chart: StateChartDescriptor) => void;
  unregisterModel: (id: string) => void;
  sendModelSnapshot: (snapshot: Snapshot<string, AnyModelData>) => void;
};

export type Subscription = { unsubscribe: () => void };

type MessageOfType<
  T extends { type: string },
  Type extends T["type"],
> = Extract<T, { type: Type }>;

/**
 * Generic bidirectional message transport.
 */
interface MessageTransport<
  TSend extends { type: string },
  TReceive extends { type: string },
> {
  send: (message: TSend) => void;

  onConnected: (cb: () => void) => void;

  onDisonnected: (cb: () => void) => void;

  onMessage: <Type extends TReceive["type"]>(
    type: Type,
    listener: (message: MessageOfType<TReceive, Type>) => void
  ) => Subscription;

  destroy?: () => void;
}

export type ClientTransport = MessageTransport<
  ClientMessages,
  ServerMessages
> & { connect: () => Promise<void> };

export type ServerTransport = MessageTransport<ServerMessages, ClientMessages>;

/**
 * Messages sent by client.
 */
export type ClientMessages = { type: "CONNECT" };

/**
 * Messages sent by server.
 */
export type ServerMessages =
  | { type: "DISCONNECTED" }
  | { type: "CONNECTED" }
  | { type: "SNAPSHOT"; snapshot: Snapshot<string, AnyModelData> }
  | { type: "MODEL_ADDED"; snapshot: Snapshot<string, AnyModelData> }
  | { type: "MODEL_REMOVED"; id: string }
  | { type: "REGISTER_CHART"; chart: StateChartDescriptor };

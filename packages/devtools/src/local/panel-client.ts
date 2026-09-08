import {
  createApiClient,
  createDirectClientTransport,
  type ApiClient,
  type ApiDefinition,
  type ApiServer,
  type ClientTransport,
} from "@solid-component-model/rpc";
import type { ComponentModelDevToolsApi } from "solid-component-model";

export interface LocalPanelTransportOptions<
  TApi extends ApiDefinition = ComponentModelDevToolsApi,
> {
  /**
   * Optional direct ApiServer instance to connect to.
   */
  server?: ApiServer<TApi>;

  /**
   * Optional underlying ClientTransport (e.g. from createLocalTransportPair).
   */
  transport?: ClientTransport;

  /**
   * Source identifier matching the devtools rpc messages.
   * @default "devtools-rpc"
   */
  source?: string;
}

export interface LocalPanelClientOptions<
  TApi extends ApiDefinition = ComponentModelDevToolsApi,
> extends LocalPanelTransportOptions<TApi> {
  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;
}

/**
 * Creates a ClientTransport for in-memory / local development.
 */
export function createLocalPanelTransport<
  TApi extends ApiDefinition = ComponentModelDevToolsApi,
>(options: LocalPanelTransportOptions<TApi> = {}): ClientTransport {
  if (options.server) {
    return createDirectClientTransport(options.server);
  }
  if (options.transport) {
    return options.transport;
  }
  throw new Error(
    "createLocalPanelTransport requires either a 'server' or a 'transport' in options"
  );
}

/**
 * Creates an ApiClient configured for in-memory / local webapp development.
 */
export function createLocalPanelClient<
  TApi extends ApiDefinition = ComponentModelDevToolsApi,
>(options: LocalPanelClientOptions<TApi> = {}): ApiClient<TApi> {
  let transport: ClientTransport | undefined;
  if (options.server || options.transport) {
    transport = createLocalPanelTransport(options);
  }

  return createApiClient<TApi>({
    transport,
    source: options.source ?? "devtools-rpc",
    timeout: options.timeout,
  });
}

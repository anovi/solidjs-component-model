import {
  createApiClient,
  createApiServer,
  createLocalTransportPair,
  type ApiClient,
  type ApiDefinition,
  type ApiHandlers,
  type ApiServer,
} from "@solid-component-model/rpc";
import type {
  ComponentModelDevToolsApi,
  GlobalDevContext,
} from "solid-component-model";
import { createLocalDevToolsServer } from "./server";

export interface LocalDevToolsConnection<
  TApi extends ApiDefinition = ComponentModelDevToolsApi,
> {
  client: ApiClient<TApi>;
  server: ApiServer<TApi>;
  destroy: () => void;
}

export interface LocalDevToolsOptions {
  /**
   * Source identifier matching the devtools rpc messages.
   * @default "devtools-rpc"
   */
  source?: string;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;
}

/**
 * Creates an in-memory connected client-server pair for local DevTools development.
 */
export function createLocalDevToolsConnection<
  TApi extends ApiDefinition = ComponentModelDevToolsApi,
>(
  handlers?: Partial<ApiHandlers<TApi>>,
  options: LocalDevToolsOptions = {}
): LocalDevToolsConnection<TApi> {
  const { clientTransport, serverTransport } = createLocalTransportPair();
  const source = options.source ?? "devtools-rpc";

  const server = createApiServer<TApi>({
    handlers,
    transport: serverTransport,
    source,
  });

  const client = createApiClient<TApi>({
    transport: clientTransport,
    source,
    timeout: options.timeout,
  });

  return {
    client,
    server,
    destroy() {
      client.destroy();
      server.destroy();
    },
  };
}

/**
 * Attaches the local DevTools server factory to globalThis.__COMPONENT_MODEL_DEVTOOLS_FACTORY__
 * and returns a connected ApiClient for use by the local DevTools UI panel.
 */
export function attachLocalDevTools<
  TApi extends ApiDefinition = ComponentModelDevToolsApi,
>(
  options: LocalDevToolsOptions = {}
): {
  client: ApiClient<TApi>;
  getServer: () => ApiServer<TApi> | undefined;
  destroy: () => void;
} {
  const source = options.source ?? "devtools-rpc";
  let activeServer: ApiServer<TApi> | undefined;
  const { clientTransport, serverTransport } = createLocalTransportPair();

  const globalObj = globalThis as unknown as GlobalDevContext;
  const previousFactory = globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__;

  globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__ = (handlers, opts) => {
    activeServer = createLocalDevToolsServer<TApi>({
      ...opts,
      handlers: handlers as unknown as Partial<ApiHandlers<TApi>>,
      transport: serverTransport,
      source,
    });
    return activeServer as unknown as ApiServer<ComponentModelDevToolsApi>;
  };

  // Synchronously trigger devtools creation if solid-component-model is already loaded
  if (typeof globalObj.__CREATE_COMPONENT_MODEL_DEVTOOLS__ === "function") {
    globalObj.__CREATE_COMPONENT_MODEL_DEVTOOLS__(
      globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__
    );
  } else if (
    typeof window !== "undefined" &&
    typeof window.postMessage === "function"
  ) {
    window.postMessage(
      { type: "CREATE_DEV_TOOLS", source: "scm-devtools" },
      "*"
    );
  }

  const client = createApiClient<TApi>({
    transport: clientTransport,
    source,
    timeout: options.timeout,
  });

  return {
    client,
    getServer: () => activeServer,
    destroy() {
      client.destroy();
      activeServer?.destroy();
      globalObj.__COMPONENT_MODEL_DEVTOOLS_FACTORY__ = previousFactory;
    },
  };
}

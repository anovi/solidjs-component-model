/// <reference types="chrome" />

import "./components/styles.css";
import { createChromePanelClient } from "../chrome";
import { createPanelApp } from "./App";
import { createLogsStore } from "./stores/logs";

(async function bootstrap() {
  const logger = createLogsStore();
  const client = await createChromePanelClient(logger);
  const container = document.getElementById("root") ?? document.body;
  createPanelApp({ client, container, logger });
})();

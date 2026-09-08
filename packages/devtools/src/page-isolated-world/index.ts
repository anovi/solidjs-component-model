import { createChromeContentRelay } from "../chrome";

console.log("Run content ISOLATED");

const relay = createChromeContentRelay();

void relay;

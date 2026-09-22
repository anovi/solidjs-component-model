import { AnyModel } from "../types";
import { StateChartConfig } from "./state-chart-types";

export class MachineMalformed extends Error {
  public readonly name = "Machine Malformed";

  constructor(
    message: string,
    options?: {
      cause?: unknown;
      machineConfig: StateChartConfig<AnyModel, Event>;
    }
  ) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
    if (
      "captureStackTrace" in Error &&
      typeof Error.captureStackTrace === "function"
    ) {
      Error.captureStackTrace(this, MachineMalformed);
    }
  }
}

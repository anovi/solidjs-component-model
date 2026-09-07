export class EffectFailed extends Error {
  public readonly name = "Effect Failed";

  constructor(message: string, options?: { cause?: unknown }) {
    super(`${message}`, options);
    Object.setPrototypeOf(this, new.target.prototype);
    if (
      "captureStackTrace" in Error &&
      typeof Error.captureStackTrace === "function"
    ) {
      Error.captureStackTrace(this, EffectFailed);
    }
  }
}

export class Violation extends Error {
  public readonly name = "API Violation";

  constructor(methodName: string) {
    super(
      `Violation: ⚠️ method "${methodName}" called outside an effect. Call ignored.`
    );
    Object.setPrototypeOf(this, new.target.prototype);
    if (
      "captureStackTrace" in Error &&
      typeof Error.captureStackTrace === "function"
    ) {
      Error.captureStackTrace(this, Violation);
    }
  }
}

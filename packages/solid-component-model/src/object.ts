export function hasToJSON(obj: object): obj is { toJSON: () => unknown } {
  return typeof (obj as { toJSON?: unknown }).toJSON === "function";
}

export function isClassInstance(value: unknown): value is object {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  );
}

import { For, Show } from "solid-js";
import { Collapsible } from "@ark-ui/solid";
import './json-view.css'


type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonViewerProps = {
  value: JsonValue;
};

type JsonNodeProps = {
  name?: string;
  level?: number;
  value: JsonValue;
  // root?: boolean;
};

enum PrimitiveType {
  string = 0,
  number = 1,
  bool = 2,
  date = 3,
  null = 4,
  function = 5,
  symbol = 6,
  undefined = 7,
}

function type (value: JsonValue): PrimitiveType {
  if (value === null) return PrimitiveType.null
  if (typeof value === 'string') return PrimitiveType.string
  if (typeof value === 'number') return PrimitiveType.number
  if (typeof value === 'bigint') return PrimitiveType.number
  if (typeof value === 'boolean') return PrimitiveType.bool
  if (typeof value === 'function') return PrimitiveType.function
  if (typeof value === 'symbol') return PrimitiveType.symbol
  return PrimitiveType.undefined;
}

const isObject = (value: JsonValue): value is Record<string, JsonValue> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isContainer = (value: JsonValue) =>
  Array.isArray(value) || isObject(value);

function JsonNode(props: JsonNodeProps) {
  const level = props.level || 0;
  const entries = () => {
    if (Array.isArray(props.value)) {
      return props.value.map((value, index) => ({
        key: String(index),
        value,
      }));
    }

    if (isObject(props.value)) {
      return Object.entries(props.value).map(([key, value]) => ({
        key,
        value,
      }));
    }

    return [];
  };
  const root = level === 0;

  return (
    <Show
      when={isContainer(props.value)}
      fallback={
        <div>
          <Show when={props.name !== undefined}>
            <span>{props.name}: </span>
          </Show>
          <JsonPrimitive value={props.value} />
        </div>
      }
    >
      <Show
        when={!root}
        fallback={
          <div>
            <For each={entries()}>
              {(entry) => (
                <JsonNode
                  name={entry.key}
                  value={entry.value}
                  level={level + 1}
                />
              )}
            </For>
          </div>
        }
      >
        <Collapsible.Root defaultOpen={level < 2}>
          <Collapsible.Trigger>
            <span>{props.name}</span>
          </Collapsible.Trigger>

          <Collapsible.Content>
            <For each={entries()}>
              {(entry) => (
                <JsonNode
                  name={entry.key}
                  value={entry.value}
                  level={level + 1}
                />
              )}
            </For>
          </Collapsible.Content>
        </Collapsible.Root>
      </Show>
    </Show>
  );
}

function JsonPrimitive(props: { value: Exclude<JsonValue, JsonValue[] | Record<string, JsonValue>> }) {
  return (
    <span classList={{
      "json-string": typeof props.value === "string",
      "json-number": typeof props.value === "number",
      "json-boolean": typeof props.value === "boolean",
      "json-null": props.value === null,
    }}>
      {props.value === null
        ? "null"
        : typeof props.value === "string"
          ? JSON.stringify(props.value)
          : String(props.value)}
    </span>
  );
}

export function JsonViewer(props: JsonViewerProps) {
  return <div class="devtools-json-viewer">
    <JsonNode value={props.value} />
  </div>
}
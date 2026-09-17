import { createSignal, For, Show } from "solid-js";
import { Collapsible } from "@ark-ui/solid";
import './json-view.css'


export type JsonValue =
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
  path: string;
  value: JsonValue;
};

// enum PrimitiveType {
//   string = 0,
//   number = 1,
//   bool = 2,
//   date = 3,
//   null = 4,
//   function = 5,
//   symbol = 6,
//   undefined = 7,
// }

// function type (value: JsonValue): PrimitiveType {
//   if (value === null) return PrimitiveType.null
//   if (typeof value === 'string') return PrimitiveType.string
//   if (typeof value === 'number') return PrimitiveType.number
//   if (typeof value === 'bigint') return PrimitiveType.number
//   if (typeof value === 'boolean') return PrimitiveType.bool
//   if (typeof value === 'function') return PrimitiveType.function
//   if (typeof value === 'symbol') return PrimitiveType.symbol
//   return PrimitiveType.undefined;
// }

const isObject = (value: JsonValue): value is Record<string, JsonValue> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isContainer = (value: JsonValue) =>
  Array.isArray(value) || isObject(value);

function JsonNode(props: JsonNodeProps) {
  const level = props.level || 0;
  const [open, setOpen] = createSignal<Record<string, boolean>>({});

  const isOpen = (path: string, level: number) =>
    open()[path] ?? level < 1;

  const setIsOpen = (path: string, value: boolean) => {
    setOpen((prev) => ({
      ...prev,
      [path]: value,
    }));
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
          <JsonPrimitive value={props.value as string | number | boolean | null } />
        </div>
      }
    >
      <Show
        when={!root}
        fallback={
          <div>
            <Show when={Array.isArray(props.value)}>
              <ArrayNode
                values={props.value as JsonValue[]}
                path={props.path} level={0}
                />
            </Show>
            <Show when={isObject(props.value)}>
              <ObjectNode
                record={props.value as { [key: string]: JsonValue }}
                path={props.path} level={0}
                />
            </Show>
          </div>
        }
      >
        <Collapsible.Root
          open={isOpen(props.path, level)}
          onOpenChange={(details) => {
            setIsOpen(props.path, details.open);
          }}
        >
          <Collapsible.Trigger>
            <span>{props.name}</span>
          </Collapsible.Trigger>

          <Collapsible.Content>
            <Show when={Array.isArray(props.value)}>
              <ArrayNode
                values={props.value as JsonValue[]}
                path={props.path} level={props?.level !== undefined ? props.level + 1 : 0}
                />
            </Show>
            <Show when={isObject(props.value)}>
              <ObjectNode
                record={props.value as { [key: string]: JsonValue }}
                path={props.path} level={props?.level !== undefined ? props.level + 1 : 0}
                />
            </Show>
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
    <JsonNode value={props.value} path="" />
  </div>
}

function ArrayNode(props: { values: JsonValue[], level: number, path: string }) {
  return <For each={props.values}>
    {(value, key) => {
      return <JsonNode
        name={String(key())}
        value={value}
        level={props.level + 1}
        path={`${props.path}.${key()}`}
      />
    }}
  </For>
}

function ObjectNode(props: { record: Record<string, JsonValue>, level: number, path: string }) {
  return <For each={Object.keys(props.record)}>
    {(key) => {
      return <JsonNode
        name={String(key)}
        value={props.record[key]}
        level={props.level + 1}
        path={`${props.path}.${key}`}
      />
    }}
  </For>
}
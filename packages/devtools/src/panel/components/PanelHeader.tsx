import { Show, type Component, type JSX } from "solid-js";

export const PanelHeader: Component<{
  title?: string;
  children?: JSX.Element;
}> = props => (
  <header class="devtools-area-header">
    <Show when={props.title}>
      <h2>{props.title}</h2>
    </Show>
    {props.children}
  </header>
);

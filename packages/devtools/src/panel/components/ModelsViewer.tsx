import { For, type Component, useContext } from "solid-js";
import './styles.css';
import { ApiClientContext } from "../context";



export const ModelsViewer: Component = () => {
  const ctx = useContext(ApiClientContext)!;
  const models = ctx.devtools.models;

  return (
    <div class="devtools-models-preview">
      <span class="devtools-models-label">
        Discovered Models ({models.length}):
      </span>
      <div class="devtools-models-tags">
        <For each={models}>
          {model => {
            return <code class="devtools-model-tag">{model.name}</code>
          }}
        </For>
      </div>
    </div>
  );
};

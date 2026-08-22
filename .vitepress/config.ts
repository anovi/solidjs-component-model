import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default withMermaid({
  srcDir: "docs",

  title: "Component Model",
  description:
    "A Component Model is a libarary that makes SolidJS project as MVVC",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Guide", link: "/start" },
      { text: "API reference", link: "/reference" },
      { text: "Examples", link: "/markdown-examples" },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [{ text: "Getting started", link: "/start" }],
      },
      {
        text: "Models",
        items: [
          { text: "Basics", link: "/model" },
          { text: "Components", link: "/components" },
          { text: "Data", link: "/data" },
          { text: "Emit events", link: "/emitting-events" },
          { text: "Spawning children", link: "/spawn-children" },
          { text: "Caching", link: "/caching" },
          { text: "Errors handling", link: "/errors-handling" },
          { text: "Invoke", link: "/invoke" },
          { text: "Scheduler", link: "/scheduler" },
        ],
      },
      {
        text: "State machines",
        items: [
          { text: "State machines", link: "/state-machines" },
          { text: "Setup a machine", link: "/setup-machine" },
          { text: "Transitions", link: "/transitions" },
          { text: "Guards", link: "/guards" },
          { text: "Effects", link: "/effects" },
          { text: "Event loop", link: "/event-loop" },
        ],
      },
      {
        text: "Advanced",
        items: [
          { text: "Migrate from Xstate", link: "/migration-from-xstate" },
        ],
      },
      {
        text: "Examples",
        items: [
          { text: "Markdown Examples", link: "/markdown-examples" },
          { text: "Runtime API Examples", link: "/api-examples" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});

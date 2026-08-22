import { generateMermaidDiagram } from "./generate-mermaid";
import type { AnyStateChartConfig } from "../src/state-chart";

/**
 * CLI script that generates a Mermaid state diagram from a state chart config module.
 *
 * Usage:
 *   npx tsx scripts/cli-mermaid.ts <path-to-config-module> [export-name]
 *
 * Example:
 *   npx tsx scripts/cli-mermaid.ts test/test-models/test-model-config.ts ModelWithConfig
 *   npx tsx scripts/cli-mermaid.ts test/test-models/model-with-hierarchy.ts ModelWithChildStateNodes
 */

import path from "path";

async function main() {
  const args = process.argv.slice(2);
  const modulePath = args[0];
  const exportName = args[1];

  if (!modulePath) {
    console.error(
      "Usage: npx tsx scripts/cli-mermaid.ts <path-to-config-module> [export-name]"
    );
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), modulePath);
  const mod = await import(absolutePath);

  // Try to find the config object.
  // If exportName is provided, use it directly.
  // Otherwise look for a `config` export, or a class with a static `config` property.
  let config: AnyStateChartConfig | undefined;

  if (exportName) {
    const exported = mod[exportName];
    if (!exported) {
      console.error(`Export "${exportName}" not found in ${modulePath}`);
      process.exit(1);
    }
    if (
      typeof exported === "object" &&
      exported !== null &&
      "states" in exported
    ) {
      config = exported as AnyStateChartConfig;
    } else if (typeof exported === "function" && "config" in exported) {
      config = (exported as { config: AnyStateChartConfig }).config;
    } else if (typeof exported === "function") {
      // The result of WithStateChart is a constructor with a private `chart` property.
      // We can't access it directly, but we can try to find the original config by
      // looking at the source or by instantiating. Instead, let's just look for any
      // property that looks like a config.
      // Since the config is passed to WithStateChart but not stored on the result in a
      // public way, we need another approach.
      console.error(
        `Export "${exportName}" is a constructor without a public static config.`
      );
      console.error(
        `Please pass the config object directly or export it separately.`
      );
      process.exit(1);
    } else if (typeof exported === "object" && exported !== null) {
      const cfg = (exported as Record<string, unknown>).config;
      if (cfg && typeof cfg === "object" && "states" in cfg) {
        config = cfg as AnyStateChartConfig;
      } else {
        console.error(
          `Export "${exportName}" does not look like a state chart config or a model class.`
        );
        process.exit(1);
      }
    } else {
      console.error(
        `Export "${exportName}" does not look like a state chart config or a model class.`
      );
      process.exit(1);
    }
  } else {
    if (
      mod.config &&
      typeof mod.config === "object" &&
      "states" in mod.config
    ) {
      config = mod.config as AnyStateChartConfig;
    } else {
      // Scan for a class with static config
      for (const key of Object.keys(mod)) {
        const exported = mod[key];
        if (typeof exported === "function" && "config" in exported) {
          config = (exported as { config: AnyStateChartConfig }).config;
          break;
        }
      }
    }
  }

  if (!config) {
    console.error("Could not find a state chart config in the module.");
    console.error(
      "Expected either a `config` export, or a class with a static `config` property."
    );
    process.exit(1);
  }

  const diagram = generateMermaidDiagram(config);
  console.log(diagram);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

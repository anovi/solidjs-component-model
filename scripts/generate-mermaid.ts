import type { AnyStateChartConfig, Transition } from '../src/state-chart';

/**
 * Generates a Mermaid state diagram from a StateChartConfig.
 *
 * Usage:
 *   import { generateMermaidDiagram } from './scripts/generate-mermaid';
 *   const diagram = generateMermaidDiagram(myConfig);
 */

function sanitizeMermaidId(id: string): string {
    // Mermaid IDs can't contain dots or hyphens in some contexts.
    // Replace dots with underscores for safe node IDs.
    return id.replace(/\./g, '_').replace(/-/g, '_');
}

function getDisplayName(path: string): string {
    // Show just the last segment for readability.
    const parts = path.split('.');
    return parts[parts.length - 1] || path;
}

function collectStates(
    config: AnyStateChartConfig,
    prefix: string,
    parentPath: string | null,
    result: {
        nodes: Map<string, { parent: string | null; hasChildren: boolean; initial?: string }>;
        transitions: Array<{ from: string; to: string; label: string }>;
    }
) {
    const path = prefix;
    const hasChildren = !!config.states && Object.keys(config.states).length > 0;

    result.nodes.set(path, {
        parent: parentPath,
        hasChildren,
        initial: config.initial,
    });

    // Collect event-based transitions
    if (config.on) {
        for (const [eventName, handler] of Object.entries(config.on)) {
            if (!Object.hasOwn(config.on, eventName)) continue;
            const handlers = Array.isArray(handler) ? handler : [handler];
            for (const h of handlers) {
                if (h && (h as Transition<any, any>).target) {
                    const t = (h as Transition<any, any>).target!;
                    const guard = (h as Transition<any, any>).guard;
                    let label = eventName;
                    if (guard) label += ' [guard]';
                    result.transitions.push({ from: path, to: t, label });
                }
            }
        }
    }

    // Collect always (eventless) transitions
    if (config.always) {
        const handlers = Array.isArray(config.always) ? config.always : [config.always];
        for (const h of handlers) {
            if (h && h.target) {
                let label = 'always';
                if (h.guard) label += ' [guard]';
                result.transitions.push({ from: path, to: h.target, label });
            }
        }
    }

    if (config.states) {
        for (const [name, child] of Object.entries(config.states)) {
            if (!Object.hasOwn(config.states, name)) continue;
            collectStates(child, path ? `${path}.${name}` : name, path, result);
        }
    }
}

function renderState(
    path: string,
    node: { parent: string | null; hasChildren: boolean; initial?: string },
    nodes: Map<string, { parent: string | null; hasChildren: boolean; initial?: string }>,
    visited: Set<string>,
): string {
    if (visited.has(path)) return '';
    visited.add(path);

    const lines: string[] = [];
    const id = sanitizeMermaidId(path || 'root');
    const display = getDisplayName(path || 'root');

    if (node.hasChildren) {
        lines.push(`state "${display}" as ${id} {`);
        // Render children inside this compound state
        for (const [childPath, childNode] of nodes) {
            if (childNode.parent === path) {
                const childLines = renderState(childPath, childNode, nodes, visited);
                for (const line of childLines.split('\n')) {
                    if (line.trim()) {
                        lines.push('    ' + line);
                    }
                }
            }
        }
        lines.push(`}`);

        if (node.initial) {
            // Mark initial child with an [*] --> child transition inside the state
            const initialChildPath = path ? `${path}.${node.initial}` : node.initial;
            const initialId = sanitizeMermaidId(initialChildPath);
            lines.push(`[*] --> ${initialId}`);
        }
    } else {
        lines.push(`${id} : ${display}`);
    }

    return lines.join('\n');
}

function resolveTarget(target: string, fromPath: string): string {
    if (target.startsWith('.')) {
        // Relative target (ancestor lookup)
        const parts = fromPath.split('.');
        let depth = 0;
        let t = target;
        while (t.startsWith('.')) {
            depth++;
            t = t.slice(1);
        }
        const base = parts.slice(0, Math.max(0, parts.length - depth)).join('.');
        return base ? `${base}.${t}` : t;
    }
    return target;
}

export function generateMermaidDiagram(config: AnyStateChartConfig): string {
    const result = {
        nodes: new Map<string, { parent: string | null; hasChildren: boolean; initial?: string }>(),
        transitions: [] as Array<{ from: string; to: string; label: string }>,
    };

    collectStates(config, '', null, result);

    const lines: string[] = [];
    lines.push('stateDiagram-v2');

    // Render root-level states (children of empty path)
    const visited = new Set<string>();
    for (const [path, node] of result.nodes) {
        if (node.parent === null) {
            const rendered = renderState(path, node, result.nodes, visited);
            if (rendered) {
                for (const line of rendered.split('\n')) {
                    if (line.trim()) lines.push('    ' + line);
                }
            }
        }
    }

    // Root initial transition
    if (config.initial) {
        const initialPath = config.initial;
        lines.push(`    [*] --> ${sanitizeMermaidId(initialPath)}`);
    }

    // Render transitions
    for (const t of result.transitions) {
        const fromId = sanitizeMermaidId(t.from || 'root');
        const resolvedTo = resolveTarget(t.to, t.from);
        const toId = sanitizeMermaidId(resolvedTo);
        lines.push(`    ${fromId} --> ${toId} : ${t.label}`);
    }

    return lines.join('\n') + '\n';
}

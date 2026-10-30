import { stringifyNodePropertiesToCreate } from './stringify-node-properties-to-create.js';

export function stringifyNodePropertiesToUpdate(properties: Record<string, unknown> | object): string {
  const s = Object.entries(properties).map(([key, value]) => {
    if (typeof value === 'string') return `node.${key}="${value}"`;
    if (typeof value === 'object' && value !== null) return `node.${key}=${stringifyNodePropertiesToCreate(value)}`;
    return `node.${key}=${value}`;
  });

  return s.join();
}

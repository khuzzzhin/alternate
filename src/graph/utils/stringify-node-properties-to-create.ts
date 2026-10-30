export function stringifyNodePropertiesToCreate(properties: Record<string, unknown> | object): string {
  const s = Object.entries(properties).map(([key, value]) => {
    if (typeof value === 'string') return `\`${key}\`:"${value}"`;
    if (typeof value === 'object' && value !== null) return `\`${key}\`:('${JSON.stringify(value)}'::jsonb)`;
    return `\`${key}\`:${value}`;
  });

  return `{${s.join()}}`;
}

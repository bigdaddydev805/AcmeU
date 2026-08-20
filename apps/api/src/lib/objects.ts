type Dict = Record<string, any>;

function isPlainObject(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepMerge<T extends Dict>(target: T, source: Dict): T {
  for (const key of Object.keys(source)) {
    const incoming = source[key];
    if (isPlainObject(incoming)) {
      const existing = (target as Dict)[key];
      (target as Dict)[key] = isPlainObject(existing)
        ? deepMerge(existing, incoming)
        : deepMerge({}, incoming);
    } else if (incoming !== undefined) {
      (target as Dict)[key] = incoming;
    }
  }
  return target;
}

export function pick<T extends Dict, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in source) out[key] = source[key];
  }
  return out;
}

export function omit<T extends Dict>(source: T, keys: readonly string[]): Dict {
  const out: Dict = {};
  for (const key of Object.keys(source)) {
    if (!keys.includes(key)) out[key] = source[key];
  }
  return out;
}

export function camelize<T extends Dict>(row: Dict): T {
  const out: Dict = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase())] = value;
  }
  return out as T;
}

export function camelizeAll<T extends Dict>(rows: Dict[]): T[] {
  return rows.map((r) => camelize<T>(r));
}

export function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1' || value === 'yes';
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

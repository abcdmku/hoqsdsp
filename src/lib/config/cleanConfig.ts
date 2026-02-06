/**
 * Recursively removes null values from an object, converting them to undefined.
 * This is needed because CamillaDSP may send null for optional fields,
 * but expects undefined (or omitted) when receiving configs back.
 */
export function cleanNullValues<T>(obj: T): T {
  if (obj === null) {
    return undefined as T;
  }

  if (Array.isArray(obj)) {
    // Important: JSON.stringify converts `undefined` array entries to `null`.
    // Filter them out to avoid reintroducing nulls when round-tripping configs.
    return obj
      .map((item) => cleanNullValues(item))
      .filter((item) => item !== undefined) as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        result[key] = cleanNullValues(value);
      }
      // Skip null/undefined values entirely (don't add to result)
    }
    return result as T;
  }

  return obj;
}

/**
 * Strips undefined values from an object (for cleaner JSON output)
 */
export function stripUndefined<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Data fetching utility with robust fallback handling.
 */
export async function fetchJsonWithFallback<T = any>(
  url: string,
  fallbackValue: T | null = null,
  label: string | null = 'Fetch fallback'
): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (label) {
        console.warn(`[data] ${label} HTTP ${res.status}: ${url}`);
      }
      return fallbackValue;
    }
    return (await res.json()) as T;
  } catch (err: any) {
    if (label) {
      console.warn(`[data] ${label} network error: ${err?.message || err}`);
    }
    return fallbackValue;
  }
}

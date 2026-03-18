/**
 * Client-safe JSON parsing utility
 * This file contains utilities that don't require server-side dependencies
 */

export function parseJson<T>(value: string | null | undefined | any, fallback: T): T {
  if (typeof value === 'object' && value !== null) {
    return value as T;
  }
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Failed to parse JSON", error);
    return fallback;
  }
}

export function stringifyJson<T>(value: T | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error("Failed to stringify JSON", error);
    return null;
  }
}

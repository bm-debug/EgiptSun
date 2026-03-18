import {
  US,
  RU,
  ES,
  FR,
  DE,
  IT,
  PT,
  JP,
  KR,
  CN,
  SA,
  IN,
  RS,
} from "country-flag-icons/react/3x2";
import type { ComponentType } from "react";

// Map language codes to flag components
export const FLAG_MAP: Record<string, ComponentType<{ className?: string; title?: string }>> = {
  en: US,
  ru: RU,
  es: ES,
  fr: FR,
  de: DE,
  it: IT,
  pt: PT,
  ja: JP,
  ko: KR,
  zh: CN,
  ar: SA,
  hi: IN,
  rs: RS,
} as const;

/**
 * Get flag component for a language code
 * @param code Language code (e.g., 'en', 'ru')
 * @returns Flag component or undefined if not found
 */
export function getLanguageFlag(
  code: string
): ComponentType<{ className?: string; title?: string }> | undefined {
  return FLAG_MAP[code.toLowerCase()];
}


/** Generated from apps/site/src/app/globals.css - do not edit by hand. */
export type FontLoaderKey = "Inter" | "Playfair_Display" | "Geist_Mono";

export const FONT_CONFIG = {
  sans: { variable: "--font-sans" as const, font: "Inter" as FontLoaderKey },
  serif: { variable: "--font-serif" as const, font: "Playfair_Display" as FontLoaderKey },
  mono: { variable: "--font-mono" as const, font: "Geist_Mono" as FontLoaderKey },
} as const;

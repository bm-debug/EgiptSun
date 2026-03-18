/**
 * Reads --font-sans, --font-serif, --font-mono from apps/site globals.css (:root)
 * and generates font-config.generated.ts for layout. Single source of truth: globals.css.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const GLOBALS_CSS = join(ROOT, "apps", "site", "src", "app", "globals.css");
const OUT = join(ROOT, "apps", "site", "src", "lib", "font-config.generated.ts");

const CSS_FONT_TO_LOADER: Record<string, string> = {
  Inter: "Inter",
  Playfair: "Playfair_Display",
  "Playfair Display": "Playfair_Display",
  "Geist Mono": "Geist_Mono",
};

function extractFirstFont(cssValue: string): string {
  return cssValue.split(",")[0].trim();
}

function parseFontVars(css: string): { sans: string; serif: string; mono: string } {
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/s);
  if (!rootMatch) throw new Error(":root not found in globals.css");
  const block = rootMatch[1];
  const get = (name: string) => {
    const m = block.match(new RegExp(`--font-${name}:\\s*([^;]+);`));
    if (!m) throw new Error(`--font-${name} not found in globals.css`);
    return extractFirstFont(m[1].trim());
  };
  return { sans: get("sans"), serif: get("serif"), mono: get("mono") };
}

const css = readFileSync(GLOBALS_CSS, "utf-8");
const { sans, serif, mono } = parseFontVars(css);

const loaderSans = CSS_FONT_TO_LOADER[sans] ?? "Inter";
const loaderSerif = CSS_FONT_TO_LOADER[serif] ?? "Inter";
const loaderMono = CSS_FONT_TO_LOADER[mono] ?? "Inter";

const outContent = `/** Generated from apps/site/src/app/globals.css - do not edit by hand. */
export type FontLoaderKey = "Inter" | "Playfair_Display" | "Geist_Mono";

export const FONT_CONFIG = {
  sans: { variable: "--font-sans" as const, font: "${loaderSans}" as FontLoaderKey },
  serif: { variable: "--font-serif" as const, font: "${loaderSerif}" as FontLoaderKey },
  mono: { variable: "--font-mono" as const, font: "${loaderMono}" as FontLoaderKey },
} as const;
`;

writeFileSync(OUT, outContent, "utf-8");
console.log("Generated", OUT);

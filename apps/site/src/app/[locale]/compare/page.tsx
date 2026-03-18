import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.compare.title") || "Compare Products";
  const description = getTranslationValue(translations, "pages.compare.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function ComparePage() {
  if (!PUBLIC_PAGES_COMPONENTS.compare) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.compare.title") || "Compare Products";
  const description = getTranslationValue(translations, "pages.compare.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.compare title={title} description={description} />;
}

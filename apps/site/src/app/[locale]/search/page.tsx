import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.search.title") || "Search Results";
  const description = getTranslationValue(translations, "pages.search.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function SearchPage() {
  if (!PUBLIC_PAGES_COMPONENTS.search) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.search.title") || "Search Results";
  const description = getTranslationValue(translations, "pages.search.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.search title={title} description={description} />;
}

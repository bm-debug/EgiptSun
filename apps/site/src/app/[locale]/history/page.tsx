import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.history.title") || "Company History";
  const description = getTranslationValue(translations, "pages.history.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function HistoryPage() {
  if (!PUBLIC_PAGES_COMPONENTS.history) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.history.title") || "Company History";
  const description = getTranslationValue(translations, "pages.history.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.history title={title} description={description} />;
}

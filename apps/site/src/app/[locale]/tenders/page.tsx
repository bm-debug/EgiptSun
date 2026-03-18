import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.tenders.title") || "Procurement";
  const description = getTranslationValue(translations, "pages.tenders.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function TendersPage() {
  if (!PUBLIC_PAGES_COMPONENTS.tenders) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.tenders.title") || "Procurement";
  const description = getTranslationValue(translations, "pages.tenders.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.tenders title={title} description={description} />;
}

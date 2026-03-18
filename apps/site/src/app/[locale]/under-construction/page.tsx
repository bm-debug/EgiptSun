import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.under_construction.title") || "Under Construction";
  const description = getTranslationValue(translations, "pages.under_construction.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function UnderConstructionPage() {
  if (!PUBLIC_PAGES_COMPONENTS["under-construction"]) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.under_construction.title") || "Under Construction";
  const description = getTranslationValue(translations, "pages.under_construction.description") || "";

  const Component = PUBLIC_PAGES_COMPONENTS["under-construction"];
  return <Component title={title} description={description} />;
}

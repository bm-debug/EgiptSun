import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.catalog.title") || "Product Catalog";
  const description = getTranslationValue(translations, "pages.catalog.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function CatalogPage() {
  if (!PUBLIC_PAGES_COMPONENTS.catalog) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.catalog.title") || "Product Catalog";
  const description = getTranslationValue(translations, "pages.catalog.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.catalog title={title} description={description} />;
}

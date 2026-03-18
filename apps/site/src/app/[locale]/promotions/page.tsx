import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.promotions.title") || "Promotions & Special Offers";
  const description = getTranslationValue(translations, "pages.promotions.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function PromotionsPage() {
  if (!PUBLIC_PAGES_COMPONENTS.promotions) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.promotions.title") || "Promotions & Special Offers";
  const description = getTranslationValue(translations, "pages.promotions.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.promotions title={title} description={description} />;
}

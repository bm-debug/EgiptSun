import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.ads.title") || "Advertisements";
  const description = getTranslationValue(translations, "pages.ads.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function AdsPage() {
const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.ads.title") || "Advertisements";
  const description = getTranslationValue(translations, "pages.ads.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.ads title={title} description={description} />;
}

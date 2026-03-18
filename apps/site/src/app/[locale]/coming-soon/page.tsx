import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.coming_soon.title") || "Coming Soon";
  const description = getTranslationValue(translations, "pages.coming_soon.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function ComingSoonPage() {
  if (!PUBLIC_PAGES_COMPONENTS["coming-soon"]) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.coming_soon.title") || "Coming Soon";
  const description = getTranslationValue(translations, "pages.coming_soon.description") || "";

  const Component = PUBLIC_PAGES_COMPONENTS["coming-soon"];
  return <Component title={title} description={description} />;
}

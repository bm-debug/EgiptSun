import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue, getPageTranslations } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";


export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations(locale);
  const title = getTranslationValue(translations, "pages.home.title") || "Home";
  const description = getTranslationValue(translations, "pages.home.description") || PROJECT_SETTINGS.description;
  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  if (!PUBLIC_PAGES_COMPONENTS.home) {
    notFound();
  }
  const { locale } = await params;
  const pageTranslations = await getPageTranslations("home", locale);
  return <PUBLIC_PAGES_COMPONENTS.home hero={pageTranslations?.hero} />;
}

import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.gallery.title") || "Photo Gallery";
  const description = getTranslationValue(translations, "pages.gallery.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function GalleryPage() {
  if (!PUBLIC_PAGES_COMPONENTS.gallery) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.gallery.title") || "Photo Gallery";
  const description = getTranslationValue(translations, "pages.gallery.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.gallery title={title} description={description} />;
}

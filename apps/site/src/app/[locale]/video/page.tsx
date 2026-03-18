import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.video.title") || "Video Reviews";
  const description = getTranslationValue(translations, "pages.video.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function VideoPage() {
  if (!PUBLIC_PAGES_COMPONENTS.video) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.video.title") || "Video Reviews";
  const description = getTranslationValue(translations, "pages.video.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.video title={title} description={description} />;
}

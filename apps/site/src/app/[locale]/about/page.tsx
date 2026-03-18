import type { Metadata } from "next";
import { getTranslations, getTranslationValue, getPageTranslations } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.about_us.title") || "About Us";
  const description = getTranslationValue(translations, "pages.about_us.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function AboutPage() {
  if (!PUBLIC_PAGES_COMPONENTS.about) {
    notFound();
  }
  const translations = await getTranslations();
  const pageTranslations = await getPageTranslations("about_us");
  const title = getTranslationValue(translations, "pages.about_us.title") || "About Us";

  return (
    <PUBLIC_PAGES_COMPONENTS.about
      title={title}
      hero={pageTranslations.hero}
      mission={pageTranslations.mission}
      values={pageTranslations.values}
      team={pageTranslations.team}
      legal={pageTranslations.legal}
    />
  );
}


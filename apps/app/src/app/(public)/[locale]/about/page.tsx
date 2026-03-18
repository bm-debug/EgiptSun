import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue, getPageTranslations } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations(locale);
  const title = getTranslationValue(translations, "pages.about_us.title") || "About Us";
  const description = getTranslationValue(translations, "pages.about_us.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const translations = await getTranslations(locale);
  const title = getTranslationValue(translations, "pages.about_us.title") || "About Us";
  const pageTranslations = await getPageTranslations("about_us", locale);

  return (
    <PUBLIC_PAGES_COMPONENTS.about
      title={title}
      hero={pageTranslations.hero}
      mission={pageTranslations.mission}
      values={pageTranslations.values}
      team={pageTranslations.team}
      legal={pageTranslations.legal}
      statsTitle={pageTranslations.statsTitle}
      imageAlts={pageTranslations.imageAlts}
    />
  );
}


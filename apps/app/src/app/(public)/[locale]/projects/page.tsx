import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.projects.title") || "Portfolio";
  const description = getTranslationValue(translations, "pages.projects.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function ProjectsPage() {
const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.projects.title") || "Portfolio";
  const description = getTranslationValue(translations, "pages.projects.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.projects title={title} description={description} />;
}

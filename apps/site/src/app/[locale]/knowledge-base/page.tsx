import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.knowledge_base.title") || "Knowledge Base";
  const description = getTranslationValue(translations, "pages.knowledge_base.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function KnowledgeBasePage() {
  if (!PUBLIC_PAGES_COMPONENTS["knowledge-base"]) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.knowledge_base.title") || "Knowledge Base";
  const description = getTranslationValue(translations, "pages.knowledge_base.description") || "";

  const Component = PUBLIC_PAGES_COMPONENTS["knowledge-base"];
  return <Component title={title} description={description} />;
}

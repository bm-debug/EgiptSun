import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.system_status.title") || "System Status";
  const description = getTranslationValue(translations, "pages.system_status.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function SystemStatusPage() {
  if (!PUBLIC_PAGES_COMPONENTS["system-status"]) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.system_status.title") || "System Status";
  const description = getTranslationValue(translations, "pages.system_status.description") || "";

  const Component = PUBLIC_PAGES_COMPONENTS["system-status"];
  return <Component title={title} description={description} />;
}

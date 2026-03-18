import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.certificates.title") || "Certificates & Licenses";
  const description = getTranslationValue(translations, "pages.certificates.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function CertificatesPage() {
  if (!PUBLIC_PAGES_COMPONENTS.certificates) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.certificates.title") || "Certificates & Licenses";
  const description = getTranslationValue(translations, "pages.certificates.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.certificates title={title} description={description} />;
}

import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.thank_you.title") || "Thank You";
  const description = getTranslationValue(translations, "pages.thank_you.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function ThankYouPage() {
  if (!PUBLIC_PAGES_COMPONENTS["thank-you"]) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.thank_you.title") || "Thank You";
  const description = getTranslationValue(translations, "pages.thank_you.description") || "";

  const Component = PUBLIC_PAGES_COMPONENTS["thank-you"];
  return <Component title={title} description={description} />;
}

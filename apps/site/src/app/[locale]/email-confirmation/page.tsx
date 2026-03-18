import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.email_confirmation.title") || "Email Confirmation";
  const description = getTranslationValue(translations, "pages.email_confirmation.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function EmailConfirmationPage() {
  if (!PUBLIC_PAGES_COMPONENTS["email-confirmation"]) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.email_confirmation.title") || "Email Confirmation";
  const description = getTranslationValue(translations, "pages.email_confirmation.description") || "";

  const Component = PUBLIC_PAGES_COMPONENTS["email-confirmation"];
  return <Component title={title} description={description} />;
}

import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.contacts.title") || "Contact Us";
  const description = getTranslationValue(translations, "pages.contacts.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function ContactPage() {
  if (!PUBLIC_PAGES_COMPONENTS.contact) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.contacts.title") || "Contact Us";
  const description = getTranslationValue(translations, "pages.contacts.description") || "Our team is always ready to help you";

  return <PUBLIC_PAGES_COMPONENTS.contact title={title} description={description} />;
}


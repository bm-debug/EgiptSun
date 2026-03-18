import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.loyalty_program.title") || "Loyalty Program";
  const description = getTranslationValue(translations, "pages.loyalty_program.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function LoyaltyProgramPage() {
  if (!PUBLIC_PAGES_COMPONENTS["loyalty-program"]) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.loyalty_program.title") || "Loyalty Program";
  const description = getTranslationValue(translations, "pages.loyalty_program.description") || "";

  const Component = PUBLIC_PAGES_COMPONENTS["loyalty-program"];
  return <Component title={title} description={description} />;
}

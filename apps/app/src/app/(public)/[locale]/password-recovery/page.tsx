import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.password_recovery.title") || "Password Recovery";
  const description = getTranslationValue(translations, "pages.password_recovery.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function PasswordRecoveryPage() {
const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.password_recovery.title") || "Password Recovery";
  const description = getTranslationValue(translations, "pages.password_recovery.description") || "";

  const Component = PUBLIC_PAGES_COMPONENTS["password-recovery"];
  return <Component title={title} description={description} />;
}

import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.sign_up.title") || "Sign Up";
  const description = getTranslationValue(translations, "pages.sign_up.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function SignUpPage() {
  if (!PUBLIC_PAGES_COMPONENTS["sign-up"]) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.sign_up.title") || "Sign Up";
  const description = getTranslationValue(translations, "pages.sign_up.description") || "";

  const Component = PUBLIC_PAGES_COMPONENTS["sign-up"];
  return <Component title={title} description={description} />;
}

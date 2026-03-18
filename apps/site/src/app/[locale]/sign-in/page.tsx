import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.sign_in.title") || "Sign In";
  const description = getTranslationValue(translations, "pages.sign_in.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function SignInPage() {
  if (!PUBLIC_PAGES_COMPONENTS["sign-in"]) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.sign_in.title") || "Sign In";
  const description = getTranslationValue(translations, "pages.sign_in.description") || "";

  const Component = PUBLIC_PAGES_COMPONENTS["sign-in"];
  return <Component title={title} description={description} />;
}

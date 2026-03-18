import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.cart.title") || "Shopping Cart";
  const description = getTranslationValue(translations, "pages.cart.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function CartPage() {
  if (!PUBLIC_PAGES_COMPONENTS.cart) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.cart.title") || "Shopping Cart";
  const description = getTranslationValue(translations, "pages.cart.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.cart title={title} description={description} />;
}

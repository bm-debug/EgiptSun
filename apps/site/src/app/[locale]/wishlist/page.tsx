import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.wishlist.title") || "Wishlist";
  const description = getTranslationValue(translations, "pages.wishlist.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function WishlistPage() {
  if (!PUBLIC_PAGES_COMPONENTS.wishlist) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.wishlist.title") || "Wishlist";
  const description = getTranslationValue(translations, "pages.wishlist.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.wishlist title={title} description={description} />;
}

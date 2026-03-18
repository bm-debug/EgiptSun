import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { getContent } from "@/lib/get-content";
import { notFound } from "next/navigation";

type PageParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const translations = await getTranslations(locale);
  const title = getTranslationValue(translations, "pages.blog.title") || "Blog";
  const description = getTranslationValue(translations, "pages.blog.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function BlogPage({ params }: PageParams) {
  if (!PUBLIC_PAGES_COMPONENTS.blog) {
    notFound();
  }
  const { locale } = await params;
  const translations = await getTranslations(locale);
  const title = getTranslationValue(translations, "pages.blog.title") || "Blog";
  const description = getTranslationValue(translations, "pages.blog.description") || "";
  const blogPosts = await getContent("blog", locale);

  return (
    <PUBLIC_PAGES_COMPONENTS.blog
      title={title}
      description={description}
      blogPosts={blogPosts}
      basePath={`/${locale}/blog`}
    />
  );
}

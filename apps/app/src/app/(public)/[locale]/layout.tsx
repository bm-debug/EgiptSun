import { notFound } from "next/navigation";
import { DocumentDirection } from "@/packages/components/misc/document-direction";
import { ChatLayoutWrapper } from "@/packages/components/blocks-app/chat";
import { SiteLocaleProvider } from "@/contexts/LocaleContext";
import { PublicContentProvider } from "@/contexts/PublicContentContext";
import { getPageTranslations } from "@/lib/get-translations";
import { LANGUAGES } from "@/settings";

export const dynamic = "force-dynamic";

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
}) {
  const { locale } = await params;
  if (!LANGUAGES.some((l) => l.code === locale)) {
    notFound();
  }
  const [headerPage, footerPage] = await Promise.all([
    getPageTranslations("header", locale),
    getPageTranslations("footer", locale),
  ]);
  const header = (headerPage?.header as Record<string, unknown>) ?? null;
  const footer = (footerPage?.footer as Record<string, unknown>) ?? null;

  return (
    <SiteLocaleProvider locale={locale}>
      <PublicContentProvider header={header} footer={footer}>
        <ChatLayoutWrapper>
          <DocumentDirection locale={locale}>{children}</DocumentDirection>
        </ChatLayoutWrapper>
      </PublicContentProvider>
    </SiteLocaleProvider>
  );
}
import { DocumentDirection } from "@/components/DocumentDirection";
import { ChatLayoutWrapper } from "@/components/ChatLayoutWrapper";
import { SiteLocaleProvider } from "@/contexts/LocaleContext";
import { PublicContentProvider } from "@/contexts/PublicContentContext";
import { getPageTranslations } from "@/lib/get-translations";
import { LANGUAGES } from "@/settings";

export async function generateStaticParams() {
  return LANGUAGES.map((l) => ({ locale: l.code }));
}

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
}) {
  const { locale } = await params;
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
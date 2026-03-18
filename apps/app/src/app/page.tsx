import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { ChatLayoutWrapper } from "@/packages/components/blocks-app/chat";
import { DocumentDirection } from "@/packages/components/misc/document-direction";
import { SiteLocaleProvider } from "@/contexts/LocaleContext";
import { PublicContentProvider } from "@/contexts/PublicContentContext";
import { getPageTranslations } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";

export const dynamic = "force-dynamic";

export default async function RootHomePage() {
  const locale = PROJECT_SETTINGS.defaultLanguage;
  const [headerPage, footerPage, pageTranslations] = await Promise.all([
    getPageTranslations("header", locale),
    getPageTranslations("footer", locale),
    getPageTranslations("home", locale),
  ]);
  const header = (headerPage?.header as Record<string, unknown>) ?? null;
  const footer = (footerPage?.footer as Record<string, unknown>) ?? null;

  return (
    <SiteLocaleProvider locale={locale}>
      <PublicContentProvider header={header} footer={footer}>
        <ChatLayoutWrapper>
          <DocumentDirection locale={locale}>
            {PUBLIC_PAGES_COMPONENTS.home?.({ hero: pageTranslations?.hero }) ?? null}
          </DocumentDirection>
        </ChatLayoutWrapper>
      </PublicContentProvider>
    </SiteLocaleProvider>
  );
}

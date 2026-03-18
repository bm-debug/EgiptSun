import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES_COMPONENTS } from '@/app-public-components';
import { SUPPORTED_LANGUAGES, PROJECT_SETTINGS } from '@/settings';


test.describe('Public Pages Availability Tests', () => {
  test.describe.configure({ mode: 'serial' });

  const pageKeys = Object.keys(PUBLIC_PAGES_COMPONENTS).filter(key => key !== '404');

  for (const pageKey of pageKeys) {
    for (const locale of SUPPORTED_LANGUAGES) {
      test(`should not return 404 for ${pageKey} page in ${locale} locale`, async ({ page, request }) => {
        let url: string;

        if (pageKey === 'home') {
          url = locale === PROJECT_SETTINGS.defaultLanguage ? '/' : `/${locale}`;
        } else {
          url = locale === PROJECT_SETTINGS.defaultLanguage
            ? `/${pageKey}`
            : `/${locale}/${pageKey}`;
        }




        const response = await page.goto(url, {
          waitUntil: 'commit',
          timeout: 45000,
        });

        expect(response).not.toBeNull();
        expect(response?.status()).not.toBe(404);
      });
    }
  }
});

import { PROJECT_SETTINGS } from "@/settings"

type Translations = Record<string, any>

/**
 * Server-side helper to get translations
 * For use in Server Components and generateMetadata
 */
export async function getTranslations(locale?: string): Promise<Translations> {
  const targetLocale = (locale || PROJECT_SETTINGS.defaultLanguage).toLowerCase()

  try {
    const module = await import(`@/packages/content/locales/${targetLocale}.json`)
    return module.default || module
  } catch {
    if (targetLocale !== 'en') {
      try {
        const module = await import('@/packages/content/locales/en.json')
        return module.default || module
      } catch (e) {
        console.error('[getTranslations] Failed to load fallback English translations:', e)
        return {}
      }
    }
    return {}
  }
}

/**
 * Get page-specific translations
 */
export async function getPageTranslations(pageName: string, locale?: string): Promise<Translations> {
  const targetLocale = (locale || PROJECT_SETTINGS.defaultLanguage).toLowerCase()

  try {
    let pageTranslations: any = {}
    switch (pageName) {
      case 'about_us': {
        const module = await import('@/packages/content/pages/about.json')
        pageTranslations = module.default || module
        break
      }
      default:
        try {
          const module = await import(`@/packages/content/pages/${pageName}.json`)
          pageTranslations = module.default || module
        } catch {
          return {}
        }
    }
    if (pageTranslations[targetLocale]) return pageTranslations[targetLocale]
    if (targetLocale !== 'en' && pageTranslations.en) return pageTranslations.en
    return pageTranslations[targetLocale] || pageTranslations.en || {}
  } catch {
    return {}
  }
}

/**
 * Get translation value by key path
 */
export function getTranslationValue(translations: Translations, key: string): string | undefined {
  const keys = key.split('.')
  let current: any = translations
  for (const k of keys) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[k]
  }
  return typeof current === 'string' ? current : undefined
}

import { LANGUAGES, PROJECT_SETTINGS } from "@/settings"
import { getStoredLocale } from "@/lib/getInitialLocale"

type Translations = Record<string, any>
type LanguageCode = (typeof LANGUAGES)[number]["code"]

class I18nService {
  private translationsCache: Map<string, Translations> = new Map()
  private loadingPromises: Map<string, Promise<Translations>> = new Map()

  getCurrentLocale(): LanguageCode {
    if (typeof window === 'undefined') {
      return PROJECT_SETTINGS.defaultLanguage as LanguageCode
    }
    const locale = getStoredLocale()
    const supportedCodes = LANGUAGES.map(l => l.code)
    if (supportedCodes.includes(locale as LanguageCode)) {
      return locale
    }
    return PROJECT_SETTINGS.defaultLanguage as LanguageCode
  }

  async loadTranslations(locale: string): Promise<Translations> {
    const normalizedLocale = locale.toLowerCase()
    if (this.translationsCache.has(normalizedLocale)) {
      return this.translationsCache.get(normalizedLocale)!
    }
    if (this.loadingPromises.has(normalizedLocale)) {
      return this.loadingPromises.get(normalizedLocale)!
    }
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const cacheKey = `i18n-translations-${normalizedLocale}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Translations
          this.translationsCache.set(normalizedLocale, parsed)
          return parsed
        } catch (e) {
          console.error(`[I18nService] Failed to parse cached translations for ${normalizedLocale}:`, e)
        }
      }
    }
    const loadPromise = this.fetchTranslations(normalizedLocale)
    this.loadingPromises.set(normalizedLocale, loadPromise)
    try {
      const translations = await loadPromise
      this.translationsCache.set(normalizedLocale, translations)
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
        const cacheKey = `i18n-translations-${normalizedLocale}`
        sessionStorage.setItem(cacheKey, JSON.stringify(translations))
      }
      return translations
    } finally {
      this.loadingPromises.delete(normalizedLocale)
    }
  }

  private async fetchTranslations(locale: string): Promise<Translations> {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/locales/${locale}`)
        if (response.ok) {
          const text = await response.text()
          try {
            return JSON.parse(text) as Translations
          } catch {
            console.warn(`[I18nService] Invalid JSON from /api/locales/${locale}, using direct import`)
          }
        }
      } catch (e) {
        console.warn(`[I18nService] Fetch translations failed for ${locale}:`, e)
      }
    }
    try {
      const module = await import(`@/packages/content/locales/${locale}.json`)
      return module.default || module
    } catch {
      if (locale !== 'en') {
        try {
          const module = await import('@/packages/content/locales/en.json')
          return module.default || module
        } catch (e) {
          console.error('[I18nService] Failed to load fallback English translations:', e)
          return {}
        }
      }
      return {}
    }
  }

  private getValueByPath(obj: any, path: string): string | undefined {
    const keys = path.split('.')
    let current = obj
    for (const key of keys) {
      if (current == null || typeof current !== 'object') return undefined
      current = current[key]
    }
    return typeof current === 'string' ? current : undefined
  }

  async t(key: string, locale?: string): Promise<string> {
    const targetLocale = locale || this.getCurrentLocale()
    try {
      const translations = await this.loadTranslations(targetLocale)
      const translated = this.getValueByPath(translations, key)
      if (translated) return translated
      if (targetLocale !== 'en') {
        const englishTranslations = await this.loadTranslations('en')
        const englishTranslated = this.getValueByPath(englishTranslations, key)
        if (englishTranslated) return englishTranslated
      }
      return key
    } catch (e) {
      console.error(`[I18nService] Error translating key "${key}":`, e)
      return key
    }
  }

  tSync(key: string, locale?: string): string {
    const targetLocale = locale || this.getCurrentLocale()
    const normalizedLocale = targetLocale.toLowerCase()
    const translations = this.translationsCache.get(normalizedLocale)
    if (!translations) return key
    const translated = this.getValueByPath(translations, key)
    if (translated) return translated
    if (normalizedLocale !== 'en') {
      const englishTranslations = this.translationsCache.get('en')
      if (englishTranslations) {
        const englishTranslated = this.getValueByPath(englishTranslations, key)
        if (englishTranslated) return englishTranslated
      }
    }
    return key
  }

  async preload(locale: string): Promise<void> {
    await this.loadTranslations(locale)
  }

  clearCache(locale?: string): void {
    if (locale) {
      this.translationsCache.delete(locale.toLowerCase())
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`i18n-translations-${locale.toLowerCase()}`)
      }
    } else {
      this.translationsCache.clear()
      if (typeof window !== 'undefined') {
        Object.keys(sessionStorage)
          .filter(key => key.startsWith('i18n-translations-'))
          .forEach(key => sessionStorage.removeItem(key))
      }
    }
  }
}

export const i18n = new I18nService()
export type { LanguageCode }

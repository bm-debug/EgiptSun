import { LANGUAGES, PROJECT_SETTINGS } from "@/settings"

type Translations = Record<string, any>
type LanguageCode = (typeof LANGUAGES)[number]["code"]

class I18nService {
  private translationsCache: Map<string, Translations> = new Map()
  private loadingPromises: Map<string, Promise<Translations>> = new Map()

  /**
   * Get current locale from localStorage or default
   */
  getCurrentLocale(): LanguageCode {
    if (typeof window === 'undefined') {
      return PROJECT_SETTINGS.defaultLanguage as LanguageCode
    }

    const saved = localStorage.getItem('static-locale')
    const supportedCodes = LANGUAGES.map(l => l.code)
    
    if (saved && supportedCodes.includes(saved as LanguageCode)) {
      return saved as LanguageCode
    }

    return PROJECT_SETTINGS.defaultLanguage as LanguageCode
  }

  /**
   * Load translations for a specific locale
   */
  async loadTranslations(locale: string): Promise<Translations> {
    const normalizedLocale = locale.toLowerCase()
    
    // Check cache first
    if (this.translationsCache.has(normalizedLocale)) {
      return this.translationsCache.get(normalizedLocale)!
    }

    // Check if already loading
    if (this.loadingPromises.has(normalizedLocale)) {
      return this.loadingPromises.get(normalizedLocale)!
    }

    // Check sessionStorage cache (client-side only)
    // Note: Cache is disabled during development to ensure fresh translations
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

    // Load translations
    const loadPromise = this.fetchTranslations(normalizedLocale)
    this.loadingPromises.set(normalizedLocale, loadPromise)

    try {
      const translations = await loadPromise
      this.translationsCache.set(normalizedLocale, translations)
      
      // Cache in sessionStorage (client-side only)
      // Note: Cache is disabled during development to ensure fresh translations
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
        const cacheKey = `i18n-translations-${normalizedLocale}`
        sessionStorage.setItem(cacheKey, JSON.stringify(translations))
      }
      
      return translations
    } finally {
      this.loadingPromises.delete(normalizedLocale)
    }
  }

  /**
   * Fetch translations from direct import
   */
  private async fetchTranslations(locale: string): Promise<Translations> {
    // Direct import for static site
    try {
      const module = await import(`@/packages/content/locales/${locale}.json`)
      return module.default || module
    } catch {
      // Fallback to English
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

  /**
   * Get translation value by key path (e.g., "pages.home.title")
   */
  private getValueByPath(obj: any, path: string): string | undefined {
    const keys = path.split('.')
    let current = obj
    
    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined
      }
      current = current[key]
    }
    
    return typeof current === 'string' ? current : undefined
  }

  /**
   * Translate a key to the specified locale
   * @param key Translation key (supports dot notation, e.g., "pages.home.title")
   * @param locale Optional locale. If not provided, uses current locale
   * @returns Translated string or the key if translation not found
   */
  async t(key: string, locale?: string): Promise<string> {
    const targetLocale = locale || this.getCurrentLocale()
    
    try {
      const translations = await this.loadTranslations(targetLocale)
      const translated = this.getValueByPath(translations, key)
      
      if (translated) {
        return translated
      }

      // Fallback to English if not found and locale is not English
      if (targetLocale !== 'en') {
        const englishTranslations = await this.loadTranslations('en')
        const englishTranslated = this.getValueByPath(englishTranslations, key)
        if (englishTranslated) {
          return englishTranslated
        }
      }

      // Return key if no translation found
      return key
    } catch (e) {
      console.error(`[I18nService] Error translating key "${key}" for locale "${targetLocale}":`, e)
      return key
    }
  }

  /**
   * Synchronous version of t() - requires translations to be preloaded
   * @param key Translation key
   * @param locale Optional locale. If not provided, uses current locale
   * @returns Translated string or the key if translation not found
   */
  tSync(key: string, locale?: string): string {
    const targetLocale = locale || this.getCurrentLocale()
    const normalizedLocale = targetLocale.toLowerCase()
    
    const translations = this.translationsCache.get(normalizedLocale)
    if (!translations) {
      console.warn(`[I18nService] Translations for locale "${normalizedLocale}" not loaded. Use t() instead or preload with loadTranslations().`)
      return key
    }

    const translated = this.getValueByPath(translations, key)
    if (translated) {
      return translated
    }

    // Fallback to English
    if (normalizedLocale !== 'en') {
      const englishTranslations = this.translationsCache.get('en')
      if (englishTranslations) {
        const englishTranslated = this.getValueByPath(englishTranslations, key)
        if (englishTranslated) {
          return englishTranslated
        }
      }
    }

    return key
  }

  /**
   * Preload translations for a locale
   */
  async preload(locale: string): Promise<void> {
    await this.loadTranslations(locale)
  }

  /**
   * Clear cache for a specific locale or all locales
   */
  clearCache(locale?: string): void {
    if (locale) {
      const normalizedLocale = locale.toLowerCase()
      this.translationsCache.delete(normalizedLocale)
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`i18n-translations-${normalizedLocale}`)
      }
    } else {
      this.translationsCache.clear()
      if (typeof window !== 'undefined') {
        const keys = Object.keys(sessionStorage)
        keys.forEach(key => {
          if (key.startsWith('i18n-translations-')) {
            sessionStorage.removeItem(key)
          }
        })
      }
    }
  }
}

// Export singleton instance
export const i18n = new I18nService()

// Export convenience function
export const t = (key: string, locale?: string) => i18n.t(key, locale)

// Export type
export type { LanguageCode }

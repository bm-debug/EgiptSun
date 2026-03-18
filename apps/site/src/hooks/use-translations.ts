"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { i18n, type LanguageCode } from "@/lib/i18n"
import { SUPPORTED_LANGUAGES } from "@/settings"

function getLocaleFromParams(params: ReturnType<typeof useParams>, propLocale?: LanguageCode): LanguageCode {
  if (propLocale && SUPPORTED_LANGUAGES.includes(propLocale)) return propLocale
  const urlLocale = params?.locale as string | undefined
  if (urlLocale && SUPPORTED_LANGUAGES.includes(urlLocale)) return urlLocale as LanguageCode
  return i18n.getCurrentLocale()
}

export function useTranslations(locale?: LanguageCode) {
  const params = useParams()
  const effectiveLocale = getLocaleFromParams(params, locale)

  const [translations, setTranslations] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [currentLocale, setCurrentLocale] = useState<LanguageCode>(effectiveLocale)

  useEffect(() => {
    const next = getLocaleFromParams(params, locale)
    setCurrentLocale(next)
  }, [params?.locale, locale])

  useEffect(() => {
    let cancelled = false
    const loadTranslations = async () => {
      setIsLoading(true)
      try {
        const loaded = await i18n.loadTranslations(effectiveLocale)
        if (!cancelled) {
          setTranslations(loaded)
          setCurrentLocale(effectiveLocale)
        }
      } catch (error) {
        if (!cancelled) {
          console.error(`[useTranslations] Failed to load translations for ${effectiveLocale}:`, error)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadTranslations()
    return () => { cancelled = true }
  }, [effectiveLocale])

  const t = (key: string): string => {
    const keys = key.split('.')
    let current: any = translations
    
    for (const k of keys) {
      if (current == null || typeof current !== 'object') {
        return key
      }
      current = current[k]
    }
    
    if (typeof current === 'string') {
      return current
    }

    // Fallback to English if not found
    if (currentLocale !== 'en' && translations.pages) {
      // Try to get from English fallback (would need to load separately)
      return key
    }

    return key
  }

  return {
    t,
    locale: currentLocale,
    setLocale: (newLocale: LanguageCode) => {
      setCurrentLocale(newLocale)
      if (typeof window !== 'undefined') {
        localStorage.setItem('static-locale', newLocale)
      }
    },
    isLoading,
    translations,
  }
}

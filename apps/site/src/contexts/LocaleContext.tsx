'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { PROJECT_SETTINGS, LANGUAGES } from '@/settings'
import type { LanguageCode } from '@/lib/i18n'

type LocaleContextType = {
  locale: LanguageCode | ''
  localePath: string
  setLocale: (locale: LanguageCode) => void
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

type LocaleProviderProps = {
  children: React.ReactNode
  locale?: string | string[] | undefined
}

export function SiteLocaleProvider({ children, locale: localeProp }: LocaleProviderProps) {
  // Extract locale from prop (can be string, string[], or undefined)
  const localeFromProp = useMemo(() => {
    // Handle undefined or null
    if (localeProp === undefined || localeProp === null) {
      return null
    }
    
    // Handle array (from [[...locale]] route)
    if (Array.isArray(localeProp)) {
      // Empty array means no locale in URL - return empty string
      if (localeProp.length === 0) {
        return ''
      }
      // Return first element, preserve empty string
      return localeProp[0] || ''
    }
    
    // Handle string - preserve empty string as is
    return localeProp
  }, [localeProp])

  // Determine the current locale
  const currentLocale = useMemo<LanguageCode | ''>(() => {
    // If locale is empty string, return it as is
    if (localeFromProp === '') {
      return ''
    }

    // If locale is provided from URL params and is valid, use it
    if (localeFromProp && localeFromProp !== '') {
      const supportedCodes = LANGUAGES.map(l => l.code)
      if (supportedCodes.includes(localeFromProp as LanguageCode)) {
        return localeFromProp as LanguageCode
      }
    }

    // Default: always return empty string when:
    // - localeProp is undefined/null
    // - localeProp is empty string ''
    // - localeProp is empty array []
    // - localeProp is not in supported languages
    return ''
  }, [localeFromProp])

  // Save locale to localStorage for client-side persistence
  const setLocale = (newLocale: LanguageCode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('static-locale', newLocale)
      // Reload page to apply new locale
      window.location.reload()
    }
  }

  const value = useMemo(
    () => ({
      locale: currentLocale,
      localePath: (currentLocale === '' || currentLocale === PROJECT_SETTINGS.defaultLanguage) ? '' : `/${currentLocale}`,
      setLocale,
    }),
    [currentLocale]
  )

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useAltrpLocale(): {
  locale: LanguageCode | ''
  localePath: string
  setLocale: (locale: LanguageCode) => void
} {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useAltrpLocale must be used within a LocaleProvider')
  }
  return context
}

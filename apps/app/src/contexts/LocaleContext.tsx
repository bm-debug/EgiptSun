'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { PROJECT_SETTINGS, LANGUAGES } from '@/settings'
import type { LanguageCode } from '@/lib/i18n'
import { persistLocaleForAuthenticatedUser, syncLocaleStorage } from '@/lib/getInitialLocale'

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
  const localeFromProp = useMemo(() => {
    if (localeProp === undefined || localeProp === null) return null
    if (Array.isArray(localeProp)) {
      if (localeProp.length === 0) return ''
      return localeProp[0] || ''
    }
    return localeProp
  }, [localeProp])

  const currentLocale = useMemo<LanguageCode | ''>(() => {
    if (localeFromProp === '') return ''
    if (localeFromProp && localeFromProp !== '') {
      const supportedCodes = LANGUAGES.map(l => l.code)
      if (supportedCodes.includes(localeFromProp as LanguageCode)) {
        return localeFromProp as LanguageCode
      }
    }
    return ''
  }, [localeFromProp])

  const setLocale = (newLocale: LanguageCode) => {
    if (typeof window !== 'undefined') {
      syncLocaleStorage(newLocale)
      void persistLocaleForAuthenticatedUser(newLocale)
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

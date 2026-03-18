"use client"

import * as React from "react"
import { Check } from "lucide-react"
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { LANGUAGES, PROJECT_SETTINGS } from "@/settings"

type Expanse = {
  id: number
  xaid: string | null
  title: string | Record<string, string> | null
  status_name: string | null
  order: number | null
}

type ExpanseSelectorProps = {
  translations?: any
}

export const ExpanseSelector = React.memo(function ExpanseSelector({
  translations,
}: ExpanseSelectorProps) {
  type LanguageCode = (typeof LANGUAGES)[number]['code']
  const supportedLanguageCodes = LANGUAGES.map(lang => lang.code)
  
  const [locale, setLocale] = React.useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-locale')
      if (saved && supportedLanguageCodes.includes(saved as LanguageCode)) {
        return saved as LanguageCode
      }
    }
    const defaultLang = PROJECT_SETTINGS.defaultLanguage
    if (supportedLanguageCodes.includes(defaultLang as LanguageCode)) {
      return defaultLang as LanguageCode
    }
    return LANGUAGES[0]?.code || 'en'
  })

  const [expanses, setExpanses] = React.useState<Expanse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedXaid, setSelectedXaid] = React.useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selected-expanse-xaid')
    }
    return null
  })
  const [loadedTranslations, setLoadedTranslations] = React.useState<any>(null)

  // Load translations if not provided via props
  React.useEffect(() => {
    if (translations) {
      setLoadedTranslations(translations)
      return
    }

    const loadTranslations = async () => {
      try {
        const cacheKey = `sidebar-translations-${locale}`
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null
        
        if (cached) {
          try {
            const cachedTranslations = JSON.parse(cached)
            setLoadedTranslations(cachedTranslations)
          } catch (e) {
            // If parsing fails, proceed with fetch
          }
        }
        
        const response = await fetch(`/api/locales/${locale}`)
        if (!response.ok) {
          throw new Error(`Failed to load translations: ${response.status}`)
        }
        const translationsData = await response.json() as any
        setLoadedTranslations(translationsData)
        
        // Cache translations
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(translationsData))
        }
      } catch (e) {
        console.error('[ExpanseSelector] Failed to load translations:', e)
        // Fallback to direct import
        try {
          try {
            const translationsModule = await import(`@/packages/content/locales/${locale}.json`)
            setLoadedTranslations(translationsModule.default || translationsModule)
          } catch {
            const translationsModule = await import("@/packages/content/locales/en.json")
            setLoadedTranslations(translationsModule.default || translationsModule)
          }
        } catch (fallbackError) {
          console.error('Fallback import also failed:', fallbackError)
        }
      }
    }
    
    loadTranslations()
  }, [locale, translations])

  // Use provided translations or loaded translations
  const effectiveTranslations = translations || loadedTranslations

  // Sync locale with sidebar when it changes
  React.useEffect(() => {
    const handleLocaleChanged = (e: StorageEvent | CustomEvent) => {
      const newLocale = (e as CustomEvent).detail || (e as StorageEvent).newValue
      if (newLocale && supportedLanguageCodes.includes(newLocale as LanguageCode)) {
        setLocale(newLocale as LanguageCode)
      }
    }

    window.addEventListener('storage', handleLocaleChanged as EventListener)
    window.addEventListener('sidebar-locale-changed', handleLocaleChanged as EventListener)

    return () => {
      window.removeEventListener('storage', handleLocaleChanged as EventListener)
      window.removeEventListener('sidebar-locale-changed', handleLocaleChanged as EventListener)
    }
  }, [supportedLanguageCodes])

  // Load expanses from API
  React.useEffect(() => {
    const fetchExpanses = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/expanses?p=1&ps=100', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch expanses: ${response.status}`)
        }

        const data = await response.json() as { success?: boolean; data?: Expanse[] }
        if (data.success && Array.isArray(data.data)) {
          // Filter out deleted expanses (status_name is null means deleted) and sort by order, then by id
          const filtered = (data.data || [])
            .filter((expanse: Expanse) => expanse.status_name !== null && expanse.xaid !== null)
            .sort((a: Expanse, b: Expanse) => {
              const orderA = a.order ?? 0
              const orderB = b.order ?? 0
              if (orderA !== orderB) {
                return orderA - orderB
              }
              return a.id - b.id
            })
          setExpanses(filtered)
        } else {
          setExpanses([])
        }
      } catch (error) {
        console.error('Failed to load expanses:', error)
        setExpanses([])
      } finally {
        setLoading(false)
      }
    }

    fetchExpanses()
  }, [])

  // Sync selectedXaid with localStorage
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selected-expanse-xaid') {
        setSelectedXaid(e.newValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Extract title with locale fallback
  const getExpanseTitle = React.useCallback((expanse: Expanse): string => {
    if (!expanse.title) return 'Untitled'
    
    let titleValue: string | Record<string, string> = expanse.title
    if (typeof titleValue === 'string') {
      try {
        const parsed = JSON.parse(titleValue)
        if (typeof parsed === 'object' && parsed !== null) {
          titleValue = parsed as Record<string, string>
        } else {
          return String(titleValue)
        }
      } catch {
        // titleValue is string here, safe to return
        return typeof titleValue === 'string' ? titleValue : 'Untitled'
      }
    }

    if (typeof titleValue === 'object' && titleValue !== null) {
      const titleObj = titleValue as Record<string, string>
      const localeValue = titleObj[locale] 
        || titleObj.en 
        || titleObj.ru 
        || titleObj.rs
        || null
      
      if (localeValue !== null && typeof localeValue === 'string') {
        return localeValue.trim()
      }
    }

    return 'Untitled'
  }, [locale])

  // Handle expanse selection
  const handleExpanseSelect = React.useCallback((xaid: string | null) => {
    if (typeof window === 'undefined') return

    const valueToStore = xaid || ''
    localStorage.setItem('selected-expanse-xaid', valueToStore)
    setSelectedXaid(valueToStore)

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('expanse-selected', { detail: valueToStore }))
  }, [])

  // Get translated labels with proper fallback - use locale-aware fallback
  const label = React.useMemo(() => {
    if (effectiveTranslations?.expanseSelector?.label) {
      return effectiveTranslations.expanseSelector.label
    }
    // Fallback based on locale
    const loc = locale as string
    if (loc === 'ru') return "Пространство"
    if (loc === 'rs') return "Prostor"
    return "Expanse"
  }, [effectiveTranslations?.expanseSelector?.label, locale])

  const generalLabel = React.useMemo(() => {
    if (effectiveTranslations?.expanseSelector?.general) {
      return effectiveTranslations.expanseSelector.general
    }
    // Fallback based on locale
    const loc = locale as string
    if (loc === 'ru') return "Общее"
    if (loc === 'rs') return "Opšte"
    return "General"
  }, [effectiveTranslations?.expanseSelector?.general, locale])

  // Don't render if no expanses
  if (loading || expanses.length === 0) {
    return null
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-muted-foreground text-xs">
        {label}
      </DropdownMenuLabel>
      <DropdownMenuItem
        onClick={() => handleExpanseSelect(null)}
        className="gap-2 p-2"
      >
        <span>{generalLabel}</span>
        <div className="ml-auto flex items-center gap-2">
          {(!selectedXaid || selectedXaid === '') && <Check className="h-4 w-4" />}
        </div>
      </DropdownMenuItem>
      {expanses.map((expanse) => {
        const isSelected = selectedXaid === expanse.xaid
        const title = getExpanseTitle(expanse)

        return (
          <DropdownMenuItem
            key={expanse.id}
            onClick={() => handleExpanseSelect(expanse.xaid || null)}
            className="gap-2 p-2"
          >
            <span>{title}</span>
            <div className="ml-auto flex items-center gap-2">
              {isSelected && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>
        )
      })}
    </>
  )
}, (prevProps, nextProps) => {
  // Always re-render if translations change to ensure labels update
  if (prevProps.translations !== nextProps.translations) {
    return false
  }
  return true
})

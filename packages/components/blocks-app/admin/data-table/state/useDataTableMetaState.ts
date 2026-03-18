import * as React from "react"
import type { SelectOption } from "../types"
import { LANGUAGES } from "@/settings"
import { getInitialLocale } from "@/lib/getInitialLocale"

export type LanguageCode = (typeof LANGUAGES)[number]["code"]

export function useDataTableMetaState(collection: string) {
  // Use useState instead of useLocalStorage to avoid SSR issues
  const [locale, setLocaleState] = React.useState<LanguageCode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-locale")
      if (saved && LANGUAGES.map((l) => l.code).includes(saved as LanguageCode)) {
        return saved as LanguageCode
      }
    }
    return getInitialLocale()
  })

  // Sync with localStorage on client
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-locale", locale)
    }
  }, [locale])

  const setLocale = React.useCallback((newLocale: LanguageCode | ((prev: LanguageCode) => LanguageCode)) => {
    const actualLocale = typeof newLocale === 'function' ? newLocale(locale) : newLocale
    setLocaleState(actualLocale)
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-locale", actualLocale)
      window.dispatchEvent(new CustomEvent('sidebar-locale-changed', { detail: actualLocale }))
    }
  }, [locale])
  const [translations, setTranslations] = React.useState<any>(null)
  const [taxonomyConfig, setTaxonomyConfig] = React.useState<any>(null)
  const [segmentStatuses, setSegmentStatuses] = React.useState<SelectOption[]>([])

  const supportedLanguageCodes = React.useMemo(() => LANGUAGES.map((l) => l.code), [])

  // Load Taxonomy config when collection is taxonomy (store instance to avoid "cannot be invoked without 'new'" across bundle boundary)
  React.useEffect(() => {
    if (collection === "taxonomy" && typeof window !== "undefined") {
      import("@/shared/collections/taxonomy")
        .then((module) => {
          const Ctor = module.default
          setTaxonomyConfig(typeof Ctor === "function" ? new Ctor() : Ctor)
        })
        .catch((e) => {
          console.error("[DataTable] Failed to load Taxonomy config:", e)
        })
    } else {
      setTaxonomyConfig(null)
    }
  }, [collection])

  // Load segment statuses from taxonomy for expanses.status_name
  const loadSegmentStatuses = React.useCallback(async () => {
    try {
      const filters = {
        conditions: [
          {
            field: "entity",
            operator: "eq",
            values: ["Segment"],
          },
        ],
      }
      const orders = {
        orders: [{ field: "sortOrder", direction: "asc" }],
      }
      const params = new URLSearchParams()
      params.append("filters", JSON.stringify(filters))
      params.append("orders", JSON.stringify(orders))
      params.append("limit", "1000")

      const response = await fetch(`/api/admin/taxonomies?${params.toString()}`, {
        credentials: "include",
      })
      if (!response.ok) {
        const errorText = await response.text()
        console.error("[DataTable] Failed to load segment statuses:", response.status, errorText)
        throw new Error(`Failed to load statuses: ${response.status}`)
      }

      const data = (await response.json()) as {
        docs?: Array<{ name?: string; title?: string | Record<string, string>; sortOrder?: number }>
      }
      const options = (data.docs || []).map((status: any) => {
        let label = status.name || ""
        if (status.title) {
          const title = typeof status.title === "string" ? JSON.parse(status.title) : status.title
          label = title[locale] || title.en || title.ru || title.rs || status.name
        }
        return {
          value: status.name || "",
          label: label,
        }
      })
      setSegmentStatuses(options)
    } catch (e) {
      console.error("Failed to load segment statuses:", e)
      setSegmentStatuses([])
    }
  }, [locale, setSegmentStatuses])

  // Load segment statuses when collection is expanses
  React.useEffect(() => {
    if (collection === "expanses") {
      void loadSegmentStatuses()
    } else {
      setSegmentStatuses([])
    }
  }, [collection, loadSegmentStatuses, setSegmentStatuses])

  // Sync locale with sidebar when it changes
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const handleLocaleChanged = (e: StorageEvent | CustomEvent) => {
      const newLocale = (e as CustomEvent).detail || (e as StorageEvent).newValue
      if (newLocale && supportedLanguageCodes.includes(newLocale as LanguageCode)) {
        setLocale(newLocale as LanguageCode)
      }
    }

    window.addEventListener("storage", handleLocaleChanged as EventListener)
    window.addEventListener("sidebar-locale-changed", handleLocaleChanged as EventListener)

    return () => {
      window.removeEventListener("storage", handleLocaleChanged as EventListener)
      window.removeEventListener("sidebar-locale-changed", handleLocaleChanged as EventListener)
    }
  }, [supportedLanguageCodes, setLocale])

  // Load translations
  React.useEffect(() => {
    const loadTranslations = async () => {
      try {
        const cacheKey = `sidebar-translations-${locale}`
        const cached = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null

        if (cached) {
          try {
            const cachedTranslations = JSON.parse(cached)
            setTranslations(cachedTranslations)
          } catch (e) {
            console.error("[DataTable] Failed to parse cached translations:", e)
          }
        }

        const response = await fetch(`/api/locales/${locale}`)
        if (!response.ok) {
          throw new Error(`Failed to load translations: ${response.status}`)
        }
        const translationsData = await response.json()

        setTranslations(translationsData)

        if (typeof window !== "undefined") {
          sessionStorage.setItem(cacheKey, JSON.stringify(translationsData))
        }
      } catch (e) {
        console.error("[DataTable] Failed to load translations:", e)
        try {
          try {
            const translationsModule = await import(`@/packages/content/locales/${locale}.json`)
            setTranslations(translationsModule.default || translationsModule)
          } catch {
            if (locale === "ar") {
              try {
                const arModule = await import("@/packages/content/locales/ar.json")
                setTranslations(arModule.default || arModule)
              } catch {
                const translationsModule = await import("@/packages/content/locales/en.json")
                setTranslations(translationsModule.default || translationsModule)
              }
            } else {
              const translationsModule = await import("@/packages/content/locales/en.json")
              setTranslations(translationsModule.default || translationsModule)
            }
          }
        } catch (fallbackError) {
          console.error("Fallback import also failed:", fallbackError)
        }
      }
    }

    void loadTranslations()
  }, [locale])

  return {
    locale,
    setLocale,
    translations,
    setTranslations,
    taxonomyConfig,
    setTaxonomyConfig,
    segmentStatuses,
    setSegmentStatuses,
    supportedLanguageCodes,
  }
}

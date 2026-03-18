import { PROJECT_SETTINGS, LANGUAGES } from "@/settings"
export const supportedLanguageCodes = LANGUAGES.map(lang => lang.code)
export type LanguageCode = (typeof LANGUAGES)[number]['code']


  // Compute initial value
  export const getInitialLocale = (): LanguageCode => {
    // Use PROJECT_SETTINGS.defaultLanguage, but ensure it's in LANGUAGES
    const defaultLang = PROJECT_SETTINGS.defaultLanguage
    if (supportedLanguageCodes.includes(defaultLang as LanguageCode)) {
      return defaultLang as LanguageCode
    }
    // Fallback to first available language
    return LANGUAGES[0]?.code || 'en'
  }

export const isSupportedLocale = (locale: string | null | undefined): locale is LanguageCode => {
  if (!locale) return false
  return supportedLanguageCodes.includes(locale as LanguageCode)
}

export const getStoredLocale = (): LanguageCode => {
  if (typeof window === "undefined") {
    return getInitialLocale()
  }

  const userScoped = localStorage.getItem("sidebar-locale")
  if (isSupportedLocale(userScoped)) {
    return userScoped
  }

  const publicScoped = localStorage.getItem("static-locale")
  if (isSupportedLocale(publicScoped)) {
    return publicScoped
  }

  return getInitialLocale()
}

export const syncLocaleStorage = (locale: LanguageCode): void => {
  if (typeof window === "undefined") return
  localStorage.setItem("sidebar-locale", locale)
  localStorage.setItem("static-locale", locale)
  window.dispatchEvent(new CustomEvent("sidebar-locale-changed", { detail: locale }))
}

export const persistLocaleForAuthenticatedUser = async (locale: LanguageCode): Promise<void> => {
  if (typeof window === "undefined") return
  try {
    const response = await fetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ language: locale }),
    })
    if (!response.ok && response.status !== 401) {
      console.warn(`[locale] Failed to persist language (${response.status})`)
    }
  } catch (error) {
    console.warn("[locale] Failed to persist language:", error)
  }
}
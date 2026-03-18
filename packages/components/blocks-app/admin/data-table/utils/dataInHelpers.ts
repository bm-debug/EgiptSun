import type { CollectionData, DataInEntry } from "../types"

type SupportedLanguageCodes = readonly string[]

// Helper function to get data_in field label
export function getDataInFieldLabel(
  baseKey: string,
  rowData: CollectionData | null,
  locale: string,
  translations: any,
  collection: string
): string | null {
  let fieldTitle: string | null = null

  // Try to get title from data_in structure in current row
  if (rowData?.data_in) {
    try {
      let parsed: any = rowData.data_in
      if (typeof rowData.data_in === "string") {
        try {
          parsed = JSON.parse(rowData.data_in)
        } catch (e) {
          // Not JSON, ignore
        }
      }

      if (parsed && typeof parsed === "object") {
        // Find the key (case-insensitive, with or without language suffix)
        const foundKey = Object.keys(parsed).find((key) => {
          const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
          if (langMatch && langMatch[1].toLowerCase() === baseKey.toLowerCase()) {
            return true
          }
          return key.toLowerCase() === baseKey.toLowerCase()
        })

        if (foundKey && parsed[foundKey] !== undefined) {
          const value = parsed[foundKey]
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            // Try current locale first, then fallback to other locales
            const localeValue = value[locale] || value.en || value.ru || value.rs || null
            if (
              localeValue !== null &&
              localeValue !== undefined &&
              typeof localeValue === "object" &&
              "title" in localeValue
            ) {
              fieldTitle = localeValue.title || null
            }
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Try to get translation from translations object
  const fieldTranslation = translations?.dataTable?.fields?.[collection]?.[baseKey]

  // Return fieldTitle or fieldTranslation, but not baseKey directly
  return fieldTitle || fieldTranslation || null
}

export function parseLooseJson(input: string): any {
  const s = String(input ?? "").trim()
  if (!s) return ""
  // Try to parse JSON primitives/objects/arrays; fallback to string
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

export function entriesToObject(entries: DataInEntry[]) {
  // This function is used for raw JSON sync, but we should use entriesToLanguageObject instead
  // Keeping for backward compatibility but it will be replaced
  const obj: Record<string, any> = {}
  entries.forEach((e) => {
    const k = String(e.key || "").trim()
    if (!k) return
    obj[k] = parseLooseJson(e.value)
  })
  return obj
}

export function entriesToLanguageObject(
  entries: DataInEntry[],
  supportedLanguageCodes: SupportedLanguageCodes
) {
  const obj: Record<string, any> = {}
  const languageFields: Record<string, Record<string, { title: string; value: any }>> = {}
  const plainFields: Record<string, any> = {}

  for (const entry of entries) {
    const langMatch = entry.key.match(/^(.+)_([a-z]{2})$/i)
    if (langMatch && supportedLanguageCodes.includes(langMatch[2].toLowerCase())) {
      const fieldName = langMatch[1]
      const lang = langMatch[2].toLowerCase()
      if (!languageFields[fieldName]) {
        languageFields[fieldName] = {}
      }
      languageFields[fieldName][lang] = {
        title: entry.title || "",
        value: parseLooseJson(entry.value),
      }
    } else {
      plainFields[entry.key] = parseLooseJson(entry.value)
    }
  }

  // Add language fields as objects with title and value structure
  for (const [fieldName, langValues] of Object.entries(languageFields)) {
    obj[fieldName] = langValues
  }

  // Add plain fields (without language suffix)
  for (const [key, value] of Object.entries(plainFields)) {
    obj[key] = value
  }

  return obj
}

export function objectToEntries(obj: any) {
  if (!obj || typeof obj !== "object") return [] as DataInEntry[]
  const entries: DataInEntry[] = []

  for (const [k, v] of Object.entries(obj)) {
    // Check if value is an object with language keys (en, ru, rs)
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const langObj = v as Record<string, any>
      // Check if it looks like a language object (has keys like 'en', 'ru', 'rs')
      const langKeys = Object.keys(langObj).filter((key) => ["en", "ru", "rs"].includes(key.toLowerCase()))
      if (langKeys.length > 0) {
        // Expand language object into separate entries for each language
        for (const [lang, langValue] of Object.entries(langObj)) {
          if (["en", "ru", "rs"].includes(lang.toLowerCase())) {
            // Check if langValue is an object with title and value
            if (
              langValue &&
              typeof langValue === "object" &&
              !Array.isArray(langValue) &&
              ("title" in langValue || "value" in langValue)
            ) {
              entries.push({
                key: `${k}_${lang.toLowerCase()}`,
                title: langValue.title || "",
                value: langValue.value != null ? String(langValue.value) : "",
              })
            } else {
              // Legacy format: just a string value
              entries.push({
                key: `${k}_${lang.toLowerCase()}`,
                title: "",
                value: typeof langValue === "string" ? langValue : String(langValue || ""),
              })
            }
          }
        }
        continue
      }
    }

    // Regular entry (not a language object)
    entries.push({
      key: k,
      title: "",
      value: typeof v === "string" ? v : JSON.stringify(v),
    })
  }

  return entries
}

// Helper function to get unique base keys from entries (without language suffix)
export function getUniqueBaseKeys(entries: DataInEntry[], supportedLanguageCodes: SupportedLanguageCodes): string[] {
  const baseKeys = new Set<string>()
  for (const entry of entries) {
    const langMatch = entry.key.match(/^(.+)_([a-z]{2})$/i)
    if (langMatch && supportedLanguageCodes.includes(langMatch[2].toLowerCase())) {
      baseKeys.add(langMatch[1])
    } else {
      baseKeys.add(entry.key)
    }
  }
  return Array.from(baseKeys)
}

// Helper function to get title and value for a specific language from entries
export function getTitleAndValueForLanguage(
  entries: DataInEntry[],
  baseKey: string,
  lang: string
): { title: string; value: string } {
  const langKey = `${baseKey}_${lang}`
  const entry = entries.find((e) => e.key === langKey)
  return {
    title: entry?.title || "",
    value: entry?.value || "",
  }
}

// Helper function to update title and value for a specific language in entries
export function updateTitleAndValueForLanguage(
  entries: DataInEntry[],
  baseKey: string,
  lang: string,
  title: string,
  value: string,
  supportedLanguageCodes: SupportedLanguageCodes,
  duplicateToAll: boolean = false
): DataInEntry[] {
  const langKey = `${baseKey}_${lang}`

  if (duplicateToAll) {
    // Remove existing entries for this base key and add entries for all languages
    const filtered = entries.filter((e) => {
      const langMatch = e.key.match(/^(.+)_([a-z]{2})$/i)
      if (langMatch && langMatch[1] === baseKey) {
        return false
      }
      return e.key !== baseKey
    })

    // Add entries for all languages with the same title and value
    const newEntries = supportedLanguageCodes.map((l) => ({
      key: `${baseKey}_${l}`,
      title: title,
      value: value,
    }))
    return [...filtered, ...newEntries]
  }

  // Update only the current language entry, keep others unchanged to avoid re-renders
  const result = entries.map((e) => {
    if (e.key === langKey) {
      return { ...e, title: title, value: value }
    }
    return e
  })

  // If entry doesn't exist, add it
  const exists = result.some((e) => e.key === langKey)
  if (!exists) {
    result.push({ key: langKey, title: title, value: value })
  }

  return result
}

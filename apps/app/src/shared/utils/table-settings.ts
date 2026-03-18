import { VisibilityState } from '@tanstack/react-table'

export interface DataInField {
  key: string
  title: Record<string, string>
  defaultValue: string
}

export interface TableDataInFieldsResponse {
  success: boolean
  fields: DataInField[]
  cached?: boolean
}

export interface TableColumnVisibilityResponse {
  success: boolean
  columnVisibility: VisibilityState | null
}

/**
 * Get global data_in fields for a collection
 */
export async function getTableDataInFields(
  collection: string
): Promise<DataInField[]> {
  try {
    const response = await fetch(
      `/api/altrp/v1/admin/table-settings?collection=${encodeURIComponent(collection)}&type=dataInFields`,
      {
        credentials: 'include',
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch data_in fields:', response.statusText)
      return []
    }

    const data = (await response.json()) as TableDataInFieldsResponse
    return data.fields || []
  } catch (error) {
    console.error('Error fetching data_in fields:', error)
    return []
  }
}

/**
 * Get column visibility settings for a role
 */
export async function getTableColumnVisibility(
  collection: string,
  role: string
): Promise<VisibilityState | null> {
  try {
    const response = await fetch(
      `/api/altrp/v1/admin/table-settings?collection=${encodeURIComponent(collection)}&type=columnVisibility&role=${encodeURIComponent(role)}`,
      {
        credentials: 'include',
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch column visibility:', response.statusText)
      return null
    }

    const data = (await response.json()) as TableColumnVisibilityResponse
    return data.columnVisibility || null
  } catch (error) {
    console.error('Error fetching column visibility:', error)
    return null
  }
}

/**
 * Save column visibility settings for a role
 */
export async function saveTableColumnVisibility(
  collection: string,
  role: string,
  visibility: VisibilityState
): Promise<boolean> {
  try {
    const response = await fetch('/api/altrp/v1/admin/table-settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        collection,
        role,
        columnVisibility: visibility,
      }),
    })

    if (!response.ok) {
      console.error('Failed to save column visibility:', response.statusText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error saving column visibility:', error)
    return false
  }
}

/**
 * Detect data_in fields from records (client-side utility)
 */
export function detectDataInFieldsFromRecords(records: any[]): DataInField[] {
  const allFieldsMap = new Map<
    string,
    {
      titles: Record<string, Set<string>>
      defaultValue: string | null
    }
  >()

  const supportedLanguageCodes = ['en', 'ru', 'rs']

  for (const record of records) {
    const dataIn = record.data_in
    if (!dataIn) continue

    try {
      let parsed: any = dataIn
      if (typeof dataIn === 'string') {
        try {
          parsed = JSON.parse(dataIn)
        } catch {
          continue
        }
      }

      if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed)) {
          // Remove language suffix if present
          const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
          const baseKey =
            langMatch && supportedLanguageCodes.includes(langMatch[2].toLowerCase())
              ? langMatch[1]
              : key

          if (!allFieldsMap.has(baseKey)) {
            allFieldsMap.set(baseKey, {
              titles: {},
              defaultValue: null,
            })
          }

          const fieldInfo = allFieldsMap.get(baseKey)!

          // If value is an object with language keys
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const langObj = value as Record<string, any>

            // Check if it's a language object (has keys like 'en', 'ru', 'rs')
            const langKeys = Object.keys(langObj).filter((k) =>
              supportedLanguageCodes.includes(k.toLowerCase())
            )

            if (langKeys.length > 0) {
              // It's a language object
              for (const lang of langKeys) {
                const langValue = langObj[lang]
                if (
                  langValue &&
                  typeof langValue === 'object' &&
                  'title' in langValue
                ) {
                  if (!fieldInfo.titles[lang]) {
                    fieldInfo.titles[lang] = new Set()
                  }
                  if (langValue.title) {
                    fieldInfo.titles[lang].add(String(langValue.title))
                  }
                  if (!fieldInfo.defaultValue && langValue.value != null) {
                    fieldInfo.defaultValue = String(langValue.value)
                  }
                }
              }
            } else {
              // It's a plain object, might have title/value structure
              if ('title' in langObj && langObj.title) {
                // Try to determine language from key
                if (langMatch) {
                  const lang = langMatch[2].toLowerCase()
                  if (!fieldInfo.titles[lang]) {
                    fieldInfo.titles[lang] = new Set()
                  }
                  fieldInfo.titles[lang].add(String(langObj.title))
                }
              }
              if (
                !fieldInfo.defaultValue &&
                'value' in langObj &&
                langObj.value != null
              ) {
                fieldInfo.defaultValue = String(langObj.value)
              }
            }
          } else if (value !== null && value !== undefined) {
            // Simple value
            if (!fieldInfo.defaultValue) {
              fieldInfo.defaultValue = String(value)
            }
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
      continue
    }
  }

  // Convert to DataInField array
  const fields: DataInField[] = []
  for (const [baseKey, info] of allFieldsMap.entries()) {
    const title: Record<string, string> = {}

    // Get most common title for each language
    for (const lang of supportedLanguageCodes) {
      if (info.titles[lang] && info.titles[lang].size > 0) {
        // Get first title (or most common if we want to be smarter)
        const titlesArray = Array.from(info.titles[lang])
        title[lang] = titlesArray[0] || baseKey
      } else {
        // Fallback: use baseKey capitalized
        title[lang] = baseKey.charAt(0).toUpperCase() + baseKey.slice(1)
      }
    }

    fields.push({
      key: baseKey,
      title,
      defaultValue: info.defaultValue || '',
    })
  }

  return fields.sort((a, b) => a.key.localeCompare(b.key))
}

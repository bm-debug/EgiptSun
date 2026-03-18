import * as React from "react"
import type { DataInEntry } from "../types"
import { LANGUAGES } from "@/settings"
import { getTableDataInFields } from "@/shared/utils/table-settings"
import { objectToEntries as objectToEntriesValue, entriesToLanguageObject as entriesToLanguageObjectValue } from "../utils/dataInHelpers"

type LanguageCode = (typeof LANGUAGES)[number]["code"]

export function useDataTableFormState(
  collection: string,
  locale: LanguageCode,
  supportedLanguageCodes: LanguageCode[]
) {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [formData, setFormData] = React.useState<Record<string, any>>({})
  const [createError, setCreateError] = React.useState<string | null>(null)
  const [jsonFieldLanguage, setJsonFieldLanguage] = React.useState<Record<string, LanguageCode>>({})
  const [createFormTab, setCreateFormTab] = React.useState<"main" | "info" | "details">("main")
  const [createDataInLanguage, setCreateDataInLanguage] = React.useState<LanguageCode>(locale)
  const [createDataInEntries, setCreateDataInEntries] = React.useState<DataInEntry[]>([])
  const [createDataInRaw, setCreateDataInRaw] = React.useState<string>("")
  const [createDataInRawError, setCreateDataInRawError] = React.useState<string | null>(null)
  const [createKeyInputs, setCreateKeyInputs] = React.useState<Record<string, string>>({})
  const [createTitleInputs, setCreateTitleInputs] = React.useState<Record<string, string>>({})
  const [createValueInputs, setCreateValueInputs] = React.useState<Record<string, string>>({})

  const [editOpen, setEditOpen] = React.useState(false)
  const [recordToEdit, setRecordToEdit] = React.useState<any>(null)
  const [editData, setEditData] = React.useState<Record<string, any>>({})
  const [editError, setEditError] = React.useState<string | null>(null)
  const [isDuplicate, setIsDuplicate] = React.useState(false)
  const [editFormTab, setEditFormTab] = React.useState<"main" | "info" | "details">("main")
  const [editDataInLanguage, setEditDataInLanguage] = React.useState<LanguageCode>(locale)
  const [editDataInEntries, setEditDataInEntries] = React.useState<DataInEntry[]>([])
  const [editDataInRaw, setEditDataInRaw] = React.useState<string>("")
  const [editDataInRawError, setEditDataInRawError] = React.useState<string | null>(null)
  const [editKeyInputs, setEditKeyInputs] = React.useState<Record<string, string>>({})
  const [editTitleInputs, setEditTitleInputs] = React.useState<Record<string, string>>({})
  const [editValueInputs, setEditValueInputs] = React.useState<Record<string, string>>({})

  const [priceInputs, setPriceInputs] = React.useState<Record<string, string>>({})

  // Clear form data when collection changes
  React.useEffect(() => {
    setFormData({})
    setCreateError(null)
    setJsonFieldLanguage({})
    setPriceInputs({})
  }, [collection])

  // Clear edit data when collection changes
  React.useEffect(() => {
    setEditData({})
    setEditError(null)
    setRecordToEdit(null)
    setIsDuplicate(false)
    setJsonFieldLanguage({})
    setPriceInputs({})
  }, [collection])

  // Init create data_in when drawer opens
  React.useEffect(() => {
    if (!createOpen) {
      setCreateKeyInputs({})
      setCreateTitleInputs({})
      setCreateValueInputs({})
      return
    }

    const initializeDataInFields = async () => {
      const existing = (formData as any).data_in

      if (!existing || (typeof existing === "object" && Object.keys(existing).length === 0)) {
        try {
          const globalFields = await getTableDataInFields(collection)
          if (globalFields.length > 0) {
            const langObj: Record<string, Record<string, { title: string; value: string }>> = {}
            for (const field of globalFields) {
              langObj[field.key] = {}
              for (const lang of supportedLanguageCodes) {
                const title = field.title[lang] || field.title.en || field.title.ru || field.title.rs || field.key
                langObj[field.key][lang] = {
                  title,
                  value: field.defaultValue || "",
                }
              }
            }

            const entries = objectToEntriesValue(langObj)
            setCreateDataInEntries(entries)

            try {
              setCreateDataInRaw(JSON.stringify(langObj, null, 2))
            } catch {
              setCreateDataInRaw("{}")
            }
          } else {
            const entries = objectToEntriesValue(existing)
            setCreateDataInEntries(entries)
            try {
              setCreateDataInRaw(JSON.stringify(existing && typeof existing === "object" ? existing : {}, null, 2))
            } catch {
              setCreateDataInRaw("{}")
            }
          }
        } catch (error) {
          console.error("Failed to load global data_in fields:", error)
          const entries = objectToEntriesValue(existing)
          setCreateDataInEntries(entries)
          try {
            setCreateDataInRaw(JSON.stringify(existing && typeof existing === "object" ? existing : {}, null, 2))
          } catch {
            setCreateDataInRaw("{}")
          }
        }
      } else {
        const entries = objectToEntriesValue(existing)
        setCreateDataInEntries(entries)
        try {
          setCreateDataInRaw(JSON.stringify(existing && typeof existing === "object" ? existing : {}, null, 2))
        } catch {
          setCreateDataInRaw("{}")
        }
      }

      setCreateKeyInputs({})
      setCreateTitleInputs({})
      setCreateValueInputs({})
      setCreateDataInRawError(null)
      setCreateFormTab("main")
      setCreateDataInLanguage(locale)
    }

    void initializeDataInFields()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, locale, collection])

  // Init edit data_in when drawer opens
  React.useEffect(() => {
    if (!editOpen || !recordToEdit) {
      setEditKeyInputs({})
      setEditTitleInputs({})
      setEditValueInputs({})
      return
    }
    const existing = (editData as any).data_in
    const entries = objectToEntriesValue(existing)
    setEditDataInEntries(entries)
    setEditKeyInputs({})
    setEditTitleInputs({})
    setEditValueInputs({})
    try {
      setEditDataInRaw(JSON.stringify(existing && typeof existing === "object" ? existing : {}, null, 2))
    } catch {
      setEditDataInRaw("{}")
    }
    setEditDataInRawError(null)
    setEditFormTab("main")
    setEditDataInLanguage(locale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen, recordToEdit, locale])

  // Sync createDataInRaw when createDataInEntries changes
  React.useEffect(() => {
    if (!createOpen) return
    const obj = entriesToLanguageObjectValue(createDataInEntries, supportedLanguageCodes)
    try {
      setCreateDataInRaw(JSON.stringify(obj, null, 2))
      setCreateDataInRawError(null)
    } catch (e) {
      setCreateDataInRawError(e instanceof Error ? e.message : "Failed to stringify")
    }
  }, [createDataInEntries, createOpen])

  // Sync editDataInRaw when editDataInEntries changes
  React.useEffect(() => {
    if (!editOpen) return
    const obj = entriesToLanguageObjectValue(editDataInEntries, supportedLanguageCodes)
    try {
      setEditDataInRaw(JSON.stringify(obj, null, 2))
    } catch {
      // ignore
    }
  }, [editDataInEntries, editOpen])

  return {
    createOpen,
    setCreateOpen,
    formData,
    setFormData,
    createError,
    setCreateError,
    jsonFieldLanguage,
    setJsonFieldLanguage,
    createFormTab,
    setCreateFormTab,
    createDataInLanguage,
    setCreateDataInLanguage,
    createDataInEntries,
    setCreateDataInEntries,
    createDataInRaw,
    setCreateDataInRaw,
    createDataInRawError,
    setCreateDataInRawError,
    createKeyInputs,
    setCreateKeyInputs,
    createTitleInputs,
    setCreateTitleInputs,
    createValueInputs,
    setCreateValueInputs,
    editOpen,
    setEditOpen,
    recordToEdit,
    setRecordToEdit,
    editData,
    setEditData,
    editError,
    setEditError,
    isDuplicate,
    setIsDuplicate,
    editFormTab,
    setEditFormTab,
    editDataInLanguage,
    setEditDataInLanguage,
    editDataInEntries,
    setEditDataInEntries,
    editDataInRaw,
    setEditDataInRaw,
    editDataInRawError,
    setEditDataInRawError,
    editKeyInputs,
    setEditKeyInputs,
    editTitleInputs,
    setEditTitleInputs,
    editValueInputs,
    setEditValueInputs,
    priceInputs,
    setPriceInputs,
  }
}

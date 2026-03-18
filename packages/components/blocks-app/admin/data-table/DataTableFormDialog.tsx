import * as React from "react"
import {
  IconCopy,
  IconPlus,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/packages/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/packages/components/ui/revola"
import { DateTimePicker } from "@/packages/components/ui/date-time-picker"
import { PhoneInput } from "@/packages/components/ui/phone-input"
import { LANGUAGES, RTL_LOCALES } from "@/settings"

const FALLBACK_AR_USERS: Record<string, string> = {
  human_aid: "الشخص",
  email: "البريد الإلكتروني",
  password_hash: "كلمة المرور",
  is_active: "نشط",
  last_login_at: "آخر تسجيل دخول",
  email_verified_at: "تم التحقق من البريد",
  reset_password_token: "رمز إعادة تعيين كلمة المرور",
  reset_password_expiration: "انتهاء صلاحية الرمز",
  login_attempts: "محاولات تسجيل الدخول",
  lock_until: "مقفل حتى",
  created_at: "تم الإنشاء",
  updated_at: "تم التحديث",
}
import { ComboboxSelect } from "./ComboboxSelect"
import { RelationSelect } from "./RelationSelect"
import { formatDateTimeForLocale } from "./functions/formatDateTimeForLocale"
import { copyToClipboard } from "./functions/copyToClipboard"
import type { ColumnSchemaExtended, CollectionData, DataInEntry } from "./types"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Upload, CheckCircle2 } from "lucide-react"
import { MediaImagesPicker } from "@/packages/components/blocks-app/cms/MediaImagesPicker"
import { TipTapEditor } from "@/packages/components/blocks-app/cms/TipTapEditor"

type LanguageCode = (typeof LANGUAGES)[number]["code"]

function MediaCreateUpload({
  formData,
  setFormData,
  setCreateError,
  translations,
}: {
  formData: Record<string, unknown>
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>
  setCreateError: (error: string | null) => void
  translations: any
}) {
  const [uploading, setUploading] = React.useState(false)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const done = Boolean(formData._mediaUploadDone)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCreateError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/altrp/v1/admin/files/upload-for-public", {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).message || `Upload failed: ${res.status}`)
      }
      const result = (await res.json()) as { success?: boolean }
      if (!result.success) throw new Error("Upload response invalid")
      setFormData((prev) => ({ ...prev, _mediaUploadDone: true }))
      setFileName(file.name)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-sm font-medium text-start">
        {(translations as any)?.dataTable?.fields?.media?.file_name ?? "File"}
        {!done && <span className="text-destructive ms-1">*</span>}
      </Label>
      {done ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <span>{fileName ?? ((translations as any)?.dataTable?.form?.uploadSuccess ?? "File uploaded. Click Submit to add.")}</span>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="me-2 h-4 w-4" />
            {uploading ? ((translations as any)?.dataTable?.form?.uploading ?? "Uploading...") : ((translations as any)?.dataTable?.form?.uploadImage ?? "Choose file")}
          </Button>
        </>
      )}
    </div>
  )
}

type DataTableFormDialogProps = {
  t: any
  collectionLabel: string
  collection: string
  search: string
  locale: LanguageCode
  translations: any
  enabledLanguageCodes: string[]
  supportedLanguageCodes: string[]
  editableFields: ColumnSchemaExtended[]
  schema: ColumnSchemaExtended[]
  isAutoGeneratedField: (name: string, isRelation: boolean) => boolean
  getI18nJsonFieldsForCollection: (collection: string) => string[]
  formData: Record<string, any>
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>
  handleFieldChange: (fieldName: string, value: string | boolean | Date | number | string[] | null) => void
  createOpen: boolean
  setCreateOpen: React.Dispatch<React.SetStateAction<boolean>>
  createError: string | null
  setCreateError: React.Dispatch<React.SetStateAction<string | null>>
  createFormTab: "main" | "info" | "content" | "seo" | "details"
  setCreateFormTab: React.Dispatch<React.SetStateAction<"main" | "info" | "content" | "seo" | "details">>
  createDataInLanguage: LanguageCode
  setCreateDataInLanguage: React.Dispatch<React.SetStateAction<LanguageCode>>
  createDataInEntries: DataInEntry[]
  setCreateDataInEntries: React.Dispatch<React.SetStateAction<DataInEntry[]>>
  createDataInRaw: string
  setCreateDataInRaw: React.Dispatch<React.SetStateAction<string>>
  createDataInRawError: string | null
  setCreateDataInRawError: React.Dispatch<React.SetStateAction<string | null>>
  createKeyInputs: Record<string, string>
  setCreateKeyInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  createTitleInputs: Record<string, string>
  setCreateTitleInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  createValueInputs: Record<string, string>
  setCreateValueInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  handleCreateSubmit: (e: React.FormEvent) => Promise<void>
  editOpen: boolean
  setEditOpen: React.Dispatch<React.SetStateAction<boolean>>
  editData: Record<string, any>
  setEditData: React.Dispatch<React.SetStateAction<Record<string, any>>>
  editError: string | null
  setEditError: React.Dispatch<React.SetStateAction<string | null>>
  recordToEdit: CollectionData | null
  setRecordToEdit: React.Dispatch<React.SetStateAction<CollectionData | null>>
  isDuplicate: boolean
  setIsDuplicate: React.Dispatch<React.SetStateAction<boolean>>
  editFormTab: "main" | "info" | "content" | "seo" | "details"
  setEditFormTab: React.Dispatch<React.SetStateAction<"main" | "info" | "content" | "seo" | "details">>
  editDataInLanguage: LanguageCode
  setEditDataInLanguage: React.Dispatch<React.SetStateAction<LanguageCode>>
  editDataInEntries: DataInEntry[]
  setEditDataInEntries: React.Dispatch<React.SetStateAction<DataInEntry[]>>
  editDataInRaw: string
  setEditDataInRaw: React.Dispatch<React.SetStateAction<string>>
  editDataInRawError: string | null
  setEditDataInRawError: React.Dispatch<React.SetStateAction<string | null>>
  editKeyInputs: Record<string, string>
  setEditKeyInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  editTitleInputs: Record<string, string>
  setEditTitleInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  editValueInputs: Record<string, string>
  setEditValueInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  handleEditFieldChange: (fieldName: string, value: string | boolean | Date | number | string[] | null) => void
  handleEditSubmit: (e: React.FormEvent) => Promise<void>
  jsonFieldLanguage: Record<string, LanguageCode>
  setJsonFieldLanguage: React.Dispatch<React.SetStateAction<Record<string, LanguageCode>>>
  priceInputs: Record<string, string>
  setPriceInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  objectToEntries: (obj: any) => DataInEntry[]
  getUniqueBaseKeys: (entries: DataInEntry[]) => string[]
  getTitleAndValueForLanguage: (entries: DataInEntry[], baseKey: string, lang: LanguageCode) => { title: string; value: string }
  updateTitleAndValueForLanguage: (
    entries: DataInEntry[],
    baseKey: string,
    lang: LanguageCode,
    title: string,
    value: string,
    duplicateToAll?: boolean
  ) => DataInEntry[]
}

export function DataTableFormDialog({
  t,
  collectionLabel,
  collection,
  search,
  locale,
  translations,
  enabledLanguageCodes,
  supportedLanguageCodes,
  editableFields,
  schema,
  isAutoGeneratedField,
  getI18nJsonFieldsForCollection,
  formData,
  setFormData,
  handleFieldChange,
  createOpen,
  setCreateOpen,
  createError,
  setCreateError,
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
  handleCreateSubmit,
  editOpen,
  setEditOpen,
  editData,
  setEditData,
  editError,
  setEditError,
  recordToEdit,
  setRecordToEdit,
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
  handleEditFieldChange,
  handleEditSubmit,
  jsonFieldLanguage,
  setJsonFieldLanguage,
  priceInputs,
  setPriceInputs,
  objectToEntries,
  getUniqueBaseKeys,
  getTitleAndValueForLanguage,
  updateTitleAndValueForLanguage,
}: DataTableFormDialogProps) {
  const state = { collection, search }
  
  // State for roles (only for users collection)
  const [roles, setRoles] = React.useState<Array<{ uuid: string; title: string | null; name: string | null; isSystem: boolean | null }>>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [rolePopoverOpen, setRolePopoverOpen] = React.useState(false)
  
  // Load roles when editing users
  React.useEffect(() => {
    if (state.collection === 'users' && editOpen) {
      const fetchRoles = async () => {
        try {
          setRolesLoading(true)
          const response = await fetch('/api/altrp/v1/admin/roles', {
            credentials: 'include',
          })
          if (response.ok) {
            const data = await response.json() as { docs?: Array<{ uuid: string; title: string | null; name: string | null; isSystem: boolean | null }> }
            if (Array.isArray(data.docs)) {
              setRoles(data.docs)
            }
          }
        } catch (err) {
          console.error('Failed to fetch roles:', err)
        } finally {
          setRolesLoading(false)
        }
      }
      fetchRoles()
    }
  }, [state.collection, editOpen])
  
  // Load user roles when recordToEdit changes
  React.useEffect(() => {
    if (state.collection === 'users' && recordToEdit && editOpen) {
      // Fetch user with roles
      const fetchUserRoles = async () => {
        try {
          const userUuid = recordToEdit.uuid
          if (userUuid) {
            const response = await fetch(`/api/altrp/v1/admin/users/${userUuid}`, {
              credentials: 'include',
            })
            if (response.ok) {
              const data = await response.json() as { success?: boolean; user?: { roles?: Array<{ uuid: string }> } }
              if (data.success && data.user?.roles) {
                const roleUuids = data.user.roles.map((r: { uuid: string }) => r.uuid)
                setEditData((prev) => ({ ...prev, roleUuids }))
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch user roles:', err)
        }
      }
      fetchUserRoles()
    }
  }, [state.collection, recordToEdit, editOpen, setEditData])
  
  // Helper function to extract role title/label
  const getRoleLabel = React.useCallback((role: { title: string | null | object; name: string | null }) => {
    if (role.title) {
      let title: any
      if (typeof role.title === 'string') {
        try {
          title = JSON.parse(role.title)
        } catch {
          title = role.title
        }
      } else {
        title = role.title
      }
      if (typeof title === 'object' && title !== null) {
        return title[locale] || title.en || title.ru || title.rs || role.name || (t?.fields?.roles?.title ?? 'Role')
      } else {
        return String(title) || role.name || (t?.fields?.roles?.title ?? 'Role')
      }
    }
    return role.name || (t?.fields?.roles?.title ?? 'Role')
  }, [locale, t])
  
  const selectedRoles = roles.filter((role) => (editData.roleUuids || []).includes(role.uuid))

  const getFieldLabel = React.useCallback(
    (field: ColumnSchemaExtended, fieldName?: string) => {
      const name = fieldName ?? field.name
      const tLabel = (translations as any)?.dataTable?.fields?.[state.collection]?.[name]
      if (tLabel) return tLabel
      if (RTL_LOCALES.includes(locale) && state.collection === "users" && FALLBACK_AR_USERS[name])
        return FALLBACK_AR_USERS[name]
      const title = field.title
      if (typeof title === "string") return title
      if (title && typeof title === "object")
        return (title as Record<string, string>)?.[locale] || (title as Record<string, string>)?.en || name
      return name
    },
    [translations, state.collection, locale]
  )

  const systemDataInBaseKeys = React.useMemo(() => {
    const fromSchema = schema
      .filter((field) => field.name.startsWith("data_in."))
      .map((field) => field.name.replace("data_in.", ""))

    return new Set<string>([
      ...fromSchema,
      "category",
      "images",
      "content",
      "seo_title",
      "seo_description",
      "seo_keywords",
      "slug",
      "media",
      "media_id",
      "alt_text",
      "caption",
      "file_name",
    ])
  }, [schema])

  const getDataInBaseKey = React.useCallback((key: string) => {
    const langMatch = key.match(/^(.+)_([a-z]{2})$/i)
    if (langMatch && supportedLanguageCodes.includes(langMatch[2].toLowerCase())) {
      return langMatch[1]
    }
    return key
  }, [supportedLanguageCodes])

  const isCustomDataInBaseKey = React.useCallback((baseKey: string) => {
    return !systemDataInBaseKeys.has(baseKey)
  }, [systemDataInBaseKeys])

  const filterCustomDataInObject = React.useCallback((obj: Record<string, any>) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([key]) => isCustomDataInBaseKey(getDataInBaseKey(key)))
    )
  }, [getDataInBaseKey, isCustomDataInBaseKey])

  const sanitizeRawDataIn = React.useCallback((raw: string) => {
    try {
      const parsed = JSON.parse(raw || "{}") as Record<string, any>
      return JSON.stringify(filterCustomDataInObject(parsed), null, 2)
    } catch {
      return raw
    }
  }, [filterCustomDataInObject])

  const visibleCreateDataInRaw = React.useMemo(() => sanitizeRawDataIn(createDataInRaw), [createDataInRaw, sanitizeRawDataIn])
  const visibleEditDataInRaw = React.useMemo(() => sanitizeRawDataIn(editDataInRaw), [editDataInRaw, sanitizeRawDataIn])

  return (
    <>
      <ResponsiveDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            // Clear form data and price inputs when dialog closes
            setFormData({})
            setCreateError(null)
            setCreateFormTab("main")
            setCreateDataInLanguage(locale)
            setCreateDataInEntries([])
            setCreateDataInRaw("{}")
            setCreateDataInRawError(null)
            setPriceInputs((prev) => {
              const newInputs = { ...prev }
              editableFields.forEach((field) => {
                if (field.fieldType === "price") {
                  delete newInputs[`create-${field.name}`]
                }
              })
              return newInputs
            })
          }
        }}
        onlyDrawer
        direction="right"
        handleOnly
      >
        <ResponsiveDialogContent className="h-[calc(100svh-16px)] w-[560px] max-w-[95vw] overflow-hidden p-0 text-foreground" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
          <div className="flex h-full flex-col text-foreground">
            <div className="border-b px-6 py-4">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle className="text-foreground">{(t?.addRecord?.title ?? "Add record to {collection}").replace("{collection}", collectionLabel)}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="text-muted-foreground">
                  {t?.addRecord?.description ?? "Fill in the fields below."}
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
            </div>
            <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col text-foreground" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
              <div
                className={`min-h-0 flex-1 px-6 py-4 text-foreground [&_input[data-slot=input]]:bg-background! [&_input[data-slot=input]]:text-sm [&_textarea]:bg-background! [&_textarea]:text-sm **:data-[slot=select-trigger]:bg-background! **:data-[slot=select-trigger]:text-sm ${state.collection === "texts" && createFormTab === "content" ? "overflow-y-hidden" : "overflow-y-auto"}`}
                dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}
              >
                <Tabs
                  value={createFormTab}
                  onValueChange={(v) => setCreateFormTab(v as any)}
                  className={`w-full ${state.collection === "texts" && createFormTab === "content" ? "flex h-full min-h-0 flex-col items-start" : ""}`}
                >
                  <TabsList className="mb-2">
                    <TabsTrigger value="main">{t.tabs?.main ?? "Main"}</TabsTrigger>
                    {state.collection === "roles" && <TabsTrigger value="info">{t.tabs?.info ?? "Info"}</TabsTrigger>}
                    {state.collection === "texts" && <TabsTrigger value="content">{t.tabs?.content ?? t?.fields?.texts?.content ?? "Content"}</TabsTrigger>}
                    {state.collection === "texts" && <TabsTrigger value="seo">{t.tabs?.seo ?? "SEO"}</TabsTrigger>}
                    <TabsTrigger value="details">{t.tabs?.details ?? "Details"}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="main" className="mt-0">
                    <div className="grid gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                      {state.collection === "media" ? (
                        <MediaCreateUpload
                          formData={formData}
                          setFormData={setFormData}
                          setCreateError={setCreateError}
                          translations={translations}
                        />
                      ) : null}
                      {editableFields.filter((f) => {
                        if (f.name === "data_in") return false
                        if (state.collection === "media") {
                          return ["title", "alt_text", "caption", "file_name", "is_public", "type"].includes(f.name)
                        }
                        if (state.collection === "roles") {
                          // For roles, show: title, name, description, is_system, order, xaid
                          return ["title", "name", "description", "is_system", "order", "xaid"].includes(f.name)
                        }
                        if (state.collection === "expanses" && f.name === "xaid") {
                          // Hide xaid in expanses form (auto-generated)
                          return false
                        }
                        if (state.collection === "texts" && ["category", "content"].includes(f.name)) return false
                        if (state.collection === "texts" && ["data_in.seo_title", "data_in.seo_description", "data_in.seo_keywords", "data_in.slug"].includes(f.name)) return false
                        return true
                      }).map((field) => (
                        <div key={field.name} className="flex flex-col gap-2 text-start">
                          {field.fieldType === "boolean" ? (
                            <div className="flex items-center gap-2 rtl:flex-row-reverse">
                              <Checkbox
                                id={`field-${field.name}`}
                                checked={formData[field.name] === true}
                                onCheckedChange={(checked) => handleFieldChange(field.name, checked === true)}
                              />
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start cursor-pointer">
                                {getFieldLabel(field)}
                              </Label>
                            </div>
                          ) : field.fieldType === "date" || field.fieldType === "time" || field.fieldType === "datetime" ? (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <DateTimePicker
                                mode={field.fieldType}
                                value={formData[field.name] || null}
                                onChange={(date) => handleFieldChange(field.name, date)}
                                placeholder={(t.form?.select ?? "Select {field}").replace("{field}", getFieldLabel(field))}
                              />
                            </>
                          ) : field.fieldType === "phone" ? (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <PhoneInput
                                value={formData[field.name] || ""}
                                onChange={(value) => handleFieldChange(field.name, value || "")}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                              />
                            </>
                          ) : field.fieldType === "password" ? (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Input
                                id={`field-${field.name}`}
                                type="password"
                                required={!field.nullable}
                                value={formData[field.name] || ""}
                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                                minLength={8}
                              />
                              <Label htmlFor={`field-${field.name}-confirm`} className="text-sm font-medium text-start">
                                {(t.form?.confirm ?? "Confirm {field}").replace("{field}", getFieldLabel(field))}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Input
                                id={`field-${field.name}-confirm`}
                                type="password"
                                required={!field.nullable}
                                value={formData[`${field.name}_confirm`] || ""}
                                onChange={(e) => handleFieldChange(`${field.name}_confirm`, e.target.value)}
                                placeholder={(t.form?.confirm ?? "Confirm {field}").replace("{field}", getFieldLabel(field))}
                                minLength={8}
                              />
                              {formData[field.name] && formData[`${field.name}_confirm`] && formData[field.name] !== formData[`${field.name}_confirm`] && (
                                <p className="text-sm text-destructive">{t.form?.passwordsDoNotMatch || "Passwords do not match"}</p>
                              )}
                            </>
                          ) : (field.fieldType === "images" || field.name === "data_in.images") ? (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <MediaImagesPicker
                                value={Array.isArray(formData[field.name]) ? formData[field.name] : formData[field.name] ? [formData[field.name]] : []}
                                onChange={(urls) => handleFieldChange(field.name, urls)}
                                placeholder={(t.form?.select ?? "Select {field}").replace("{field}", getFieldLabel(field))}
                              />
                            </>
                          ) : (field.fieldType === "json" || field.fieldType === "tiptap") && getI18nJsonFieldsForCollection(state.collection).includes(field.name) ? (
                            <>
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                  {getFieldLabel(field)}
                                  {!field.nullable && <span className="text-destructive ms-1">*</span>}
                                </Label>
                                <Tabs
                                  value={jsonFieldLanguage[field.name] || locale}
                                  onValueChange={(value) => setJsonFieldLanguage((prev) => ({ ...prev, [field.name]: value as LanguageCode }))}
                                  className="w-auto"
                                >
                                  <TabsList className="h-8">
                                    {LANGUAGES.filter((l) => enabledLanguageCodes.includes(l.code)).map((l) => (
                                      <TabsTrigger key={l.code} value={l.code} className="text-xs px-2 py-1">
                                        {l.shortName}
                                      </TabsTrigger>
                                    ))}
                                  </TabsList>
                                </Tabs>
                              </div>
                              <Tabs
                                value={jsonFieldLanguage[field.name] || locale}
                                onValueChange={(value) => setJsonFieldLanguage((prev) => ({ ...prev, [field.name]: value as LanguageCode }))}
                                className="w-full"
                              >
                                {LANGUAGES.filter((l) => enabledLanguageCodes.includes(l.code)).map((l) => (
                                  <TabsContent key={l.code} value={l.code} className="mt-0">
                                    {field.fieldType === "tiptap" ? (
                                      <TipTapEditor
                                        content={formData[`${field.name}_${l.code}`] || ""}
                                        onChange={(html) => handleFieldChange(`${field.name}_${l.code}`, html)}
                                        placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", `${getFieldLabel(field)} (${l.name})`)}
                                      />
                                    ) : (
                                      <Input
                                        id={`field-${field.name}_${l.code}`}
                                        type="text"
                                        required={!field.nullable}
                                        value={formData[`${field.name}_${l.code}`] || ""}
                                        onChange={(e) => handleFieldChange(`${field.name}_${l.code}`, e.target.value)}
                                        placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", `${getFieldLabel(field)} (${l.name})`)}
                                      />
                                    )}
                                  </TabsContent>
                                ))}
                              </Tabs>
                            </>
                          ) : (field as any).fieldType === "price" ? (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Input
                                id={`field-${field.name}`}
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                required={!field.nullable}
                                value={
                                  priceInputs[`create-${field.name}`] !== undefined
                                    ? priceInputs[`create-${field.name}`]
                                    : formData[field.name] === undefined || formData[field.name] === null
                                      ? ""
                                      : (Number(formData[field.name]) / 100).toFixed(2)
                                }
                                onChange={(e) => {
                                  let v = e.target.value.replace(/,/g, ".")
                                  setPriceInputs((prev) => ({ ...prev, [`create-${field.name}`]: v }))
                                  if (v.includes(".")) {
                                    const [i, d] = v.split(".")
                                    v = `${i}.${d.slice(0, 2)}`
                                  }
                                  const num = v === "" ? NaN : Number(v)
                                  const cents = !isFinite(num) ? null : Math.round(num * 100)
                                  handleFieldChange(field.name, cents)
                                }}
                                onBlur={(e) => {
                                  let v = e.target.value.replace(/,/g, ".")
                                  if (v.includes(".")) {
                                    const [i, d] = v.split(".")
                                    v = `${i}.${d.slice(0, 2)}`
                                  }
                                  const num = v === "" ? NaN : Number(v)
                                  if (isFinite(num)) {
                                    const formatted = num.toFixed(2)
                                    setPriceInputs((prev) => ({ ...prev, [`create-${field.name}`]: formatted }))
                                    const cents = Math.round(num * 100)
                                    handleFieldChange(field.name, cents)
                                  }
                                }}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                              />
                            </>
                          ) : field.fieldType === "select" && field.selectOptions ? (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <ComboboxSelect
                                id={`field-${field.name}`}
                                options={field.selectOptions}
                                value={formData[field.name] || ""}
                                onValueChange={(value) => handleFieldChange(field.name, value)}
                                placeholder={(t.form?.select ?? "Select {field}").replace("{field}", getFieldLabel(field))}
                                disabled={false}
                                required={!field.nullable}
                                translations={t}
                              />
                            </>
                          ) : field.fieldType === "enum" && field.enum ? (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Select
                                value={formData[field.name] || ""}
                                onValueChange={(value) => handleFieldChange(field.name, value)}
                                required={!field.nullable}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={(t.form?.select ?? "Select {field}").replace("{field}", getFieldLabel(field))} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] z-9999" position="popper" sideOffset={5}>
                                  {field.enum.values.map((val, index) => (
                                    <SelectItem key={val} value={val}>
                                      {field.enum!.labels[index] || val}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </>
                          ) : field.relation ? (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <RelationSelect
                                relation={field.relation}
                                value={formData[field.name]}
                                onChange={(value) => handleFieldChange(field.name, value)}
                                required={!field.nullable}
                                translations={t}
                                search={state.search}
                                locale={locale}
                              />
                            </>
                          ) : field.textarea ? (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Textarea
                                id={`field-${field.name}`}
                                required={!field.nullable}
                                value={formData[field.name] || ""}
                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                                rows={6}
                              />
                            </>
                          ) : field.name === "description" ? (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Textarea
                                id={`field-${field.name}`}
                                required={!field.nullable}
                                value={formData[field.name] || ""}
                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                                rows={4}
                              />
                            </>
                          ) : (
                            <>
                              <Label htmlFor={`field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Input
                                id={`field-${field.name}`}
                                type={field.fieldType === "email" ? "email" : field.fieldType === "number" ? "number" : "text"}
                                required={!field.nullable}
                                value={formData[field.name] || ""}
                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                              />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  {state.collection === "roles" && (
                    <TabsContent value="info" className="mt-0">
                      <div className="grid gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                        {schema.filter((f) => ["id", "uuid", "order", "created_at", "updated_at"].includes(f.name)).map((field) => {
                          // For create form, these fields won't have values yet
                          const value = formData[field.name] ?? null
                          return (
                            <div key={field.name} className="flex flex-col gap-2 text-start">
                              <Label className="text-sm font-medium text-start select-text">
                                {getFieldLabel(field)}
                              </Label>
                              <div className="text-sm select-text">
                                {field.name === "created_at" || field.name === "updated_at" ? (
                                  <span className="select-text">
                                    {value ? formatDateTimeForLocale(value, locale) : "-"}
                                  </span>
                                ) : (
                                  <span className="select-text">
                                    {value ?? "-"}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>
                  )}
                  {state.collection === "texts" && (
                    <TabsContent value="content" className="mt-0 w-full flex-1 min-h-0 overflow-hidden">
                      <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-start">{t.editLanguage ?? "Language for editing"}</span>
                          <Tabs value={jsonFieldLanguage["content"] || locale} onValueChange={(v) => setJsonFieldLanguage((prev) => ({ ...prev, content: v as LanguageCode }))} className="w-auto">
                            <TabsList className="h-8">
                              {LANGUAGES.filter((l) => enabledLanguageCodes.includes(l.code)).map((l) => (
                                <TabsTrigger key={l.code} value={l.code} className="text-xs px-2 py-1">{l.shortName}</TabsTrigger>
                              ))}
                            </TabsList>
                          </Tabs>
                        </div>
                        {(() => {
                          const contentField = editableFields.find((f) => f.name === "content")
                          if (!contentField) return null
                          const contentLang = jsonFieldLanguage["content"] || locale
                          return (
                            <div className="flex h-full min-h-0 flex-col gap-2">
                              {contentField.fieldType === "tiptap" ? (
                                <div className="min-h-0 flex-1 [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-[32svh] [&_.tiptap-editor]:h-full [&_.tiptap-editor]:min-h-[32svh]">
                                  <TipTapEditor
                                    content={formData[`content_${contentLang}`] || ""}
                                    onChange={(html) => handleFieldChange(`content_${contentLang}`, html)}
                                    placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", `${getFieldLabel(contentField)} (${contentLang.toUpperCase()})`)}
                                  />
                                </div>
                              ) : (
                                <Textarea
                                  value={formData[`content_${contentLang}`] || ""}
                                  onChange={(e) => handleFieldChange(`content_${contentLang}`, e.target.value)}
                                  placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", `${getFieldLabel(contentField)} (${contentLang.toUpperCase()})`)}
                                  rows={16}
                                />
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </TabsContent>
                  )}
                  {state.collection === "texts" && (
                    <TabsContent value="seo" className="mt-0">
                      <div className="grid gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-start">{t.editLanguage ?? "Language for editing"}</span>
                          <Tabs value={jsonFieldLanguage["seo"] || locale} onValueChange={(v) => setJsonFieldLanguage((prev) => ({ ...prev, seo: v as LanguageCode }))} className="w-auto">
                            <TabsList className="h-8">
                              {LANGUAGES.filter((l) => enabledLanguageCodes.includes(l.code)).map((l) => (
                                <TabsTrigger key={l.code} value={l.code} className="text-xs px-2 py-1">{l.shortName}</TabsTrigger>
                              ))}
                            </TabsList>
                          </Tabs>
                        </div>
                        {["data_in.seo_title", "data_in.seo_description", "data_in.seo_keywords", "data_in.slug"].map((fieldName) => {
                          const field = editableFields.find((f) => f.name === fieldName)
                          if (!field) return null
                          const seoLang = jsonFieldLanguage["seo"] || locale
                          return (
                            <div key={fieldName} className="flex flex-col gap-2">
                              <Label className="text-sm font-medium text-start">
                                {getFieldLabel(field, fieldName)}
                              </Label>
                              <Input
                                value={formData[`${fieldName}_${seoLang}`] || ""}
                                onChange={(e) => handleFieldChange(`${fieldName}_${seoLang}`, e.target.value)}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field, fieldName))}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>
                  )}
                  <TabsContent value="details" className="mt-0">
                    <div className="grid gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                      {/* Language tabs */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-start">{t.editLanguage ?? "Language for editing"}</div>
                        <Tabs
                          value={createDataInLanguage}
                          onValueChange={(value) => setCreateDataInLanguage(value as LanguageCode)}
                          className="w-auto"
                        >
                          <TabsList className="h-8">
                            {LANGUAGES.filter((l) => enabledLanguageCodes.includes(l.code)).map((l) => (
                              <TabsTrigger key={l.code} value={l.code} className="text-xs px-2 py-1">
                                {l.shortName}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                      </div>

                      {/* Data_in fields */}
                      <div className="grid gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Add a new entry with a temporary unique key
                              const tempKey = `new_field_${Date.now()}`
                              setCreateDataInEntries((prev) => {
                                const newEntries = supportedLanguageCodes.map((lang) => ({
                                  key: `${tempKey}_${lang}`,
                                  title: "",
                                  value: "",
                                }))
                                return [...prev, ...newEntries]
                              })
                            }}
                          >
                            <IconPlus className="me-2 h-4 w-4" />
                            {t.addField ?? "Add field"}
                          </Button>
                        </div>
                        <div className="grid gap-3">
                          {(() => {
                            const rawKeys = getUniqueBaseKeys(createDataInEntries)
                            const uniqueBaseKeys = rawKeys.filter(isCustomDataInBaseKey)
                            if (uniqueBaseKeys.length === 0) {
                              return <div className="text-sm text-muted-foreground">{t?.noFields ?? 'No fields'}</div>
                            }
                            return uniqueBaseKeys.map((baseKey, idx) => {
                              const { title: currentTitle, value: currentValue } = getTitleAndValueForLanguage(createDataInEntries, baseKey, createDataInLanguage)
                              const tempKey = createKeyInputs[baseKey] ?? baseKey
                              const tempTitle = createTitleInputs[baseKey] ?? currentTitle
                              const tempValue = createValueInputs[baseKey] ?? currentValue

                              return (
                                <div key={`create-entry-${baseKey}-${idx}`} className="flex gap-2 items-center">
                                  <Input
                                    value={tempKey}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      // Update only the temporary state, don't update entries yet
                                      setCreateKeyInputs((prev) => ({
                                        ...prev,
                                        [baseKey]: v,
                                      }))
                                    }}
                                    onBlur={(e) => {
                                      const v = e.target.value.trim()
                                      if (!v || v === baseKey) {
                                        // Reset to original if empty or unchanged
                                        setCreateKeyInputs((prev) => {
                                          const newState = { ...prev }
                                          delete newState[baseKey]
                                          return newState
                                        })
                                        return
                                      }
                                      // Update base key in all language entries
                                      setCreateDataInEntries((prev) => {
                                        const result: DataInEntry[] = []
                                        const oldData: Record<string, { title: string; value: string }> = {}

                                        // Collect old title and value for all languages
                                        supportedLanguageCodes.forEach((lang) => {
                                          const oldLangKey = `${baseKey}_${lang}`
                                          const oldEntry = prev.find((e) => e.key === oldLangKey)
                                          if (oldEntry) {
                                            oldData[lang] = { title: oldEntry.title, value: oldEntry.value }
                                          }
                                        })

                                        // Keep entries that don't match this base key
                                        prev.forEach((entry) => {
                                          const langMatch = entry.key.match(/^(.+)_([a-z]{2})$/i)
                                          if (langMatch && langMatch[1] === baseKey) {
                                            return // Skip old entries for this base key
                                          }
                                          if (entry.key === baseKey) {
                                            return // Skip old entry without language suffix
                                          }
                                          result.push(entry)
                                        })

                                        // Add new entries with new base key
                                        supportedLanguageCodes.forEach((lang) => {
                                          result.push({
                                            key: `${v}_${lang}`,
                                            title: oldData[lang]?.title || "",
                                            value: oldData[lang]?.value || "",
                                          })
                                        })

                                        // Update temp key state with new base key
                                        setCreateKeyInputs((prev) => {
                                          const newState = { ...prev }
                                          delete newState[baseKey]
                                          newState[v] = v
                                          return newState
                                        })

                                        return result
                                      })
                                    }}
                                    placeholder="Name (key)"
                                    className="flex-1"
                                  />
                                  <Input
                                    value={tempTitle}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      // Update only temporary state, don't update entries yet
                                      setCreateTitleInputs((prev) => ({
                                        ...prev,
                                        [baseKey]: v,
                                      }))
                                    }}
                                    onBlur={(e) => {
                                      const v = e.target.value
                                      // Update title - duplicate to all languages if this is the first value entered
                                      setCreateDataInEntries((prev) => {
                                        const allEmpty = supportedLanguageCodes.every((l) => {
                                          const { value } = getTitleAndValueForLanguage(prev, baseKey, l as LanguageCode)
                                          return !value || value.trim() === ""
                                        })

                                        const currentData = getTitleAndValueForLanguage(prev, baseKey, createDataInLanguage)
                                        return updateTitleAndValueForLanguage(prev, baseKey, createDataInLanguage, v, currentData.value, allEmpty && currentData.value.trim() !== "")
                                      })
                                      // Clear temp state
                                      setCreateTitleInputs((prev) => {
                                        const newState = { ...prev }
                                        delete newState[baseKey]
                                        return newState
                                      })
                                    }}
                                    placeholder="Title"
                                    className="flex-1"
                                  />
                                  <Input
                                    value={tempValue}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      // Update only temporary state, don't update entries yet
                                      setCreateValueInputs((prev) => ({
                                        ...prev,
                                        [baseKey]: v,
                                      }))
                                    }}
                                    onBlur={(e) => {
                                      const v = e.target.value
                                      // Update value - duplicate to all languages if this is the first value entered
                                      setCreateDataInEntries((prev) => {
                                        // Check if this is the first value (all languages are empty)
                                        const allEmpty = supportedLanguageCodes.every((l) => {
                                          const { value } = getTitleAndValueForLanguage(prev, baseKey, l as LanguageCode)
                                          return !value || value.trim() === ""
                                        })

                                        const currentData = getTitleAndValueForLanguage(prev, baseKey, createDataInLanguage)
                                        return updateTitleAndValueForLanguage(prev, baseKey, createDataInLanguage, currentData.title, v, allEmpty && v.trim() !== "")
                                      })
                                      // Clear temp state
                                      setCreateValueInputs((prev) => {
                                        const newState = { ...prev }
                                        delete newState[baseKey]
                                        return newState
                                      })
                                    }}
                                    placeholder={(translations as any)?.dataTable?.valuePlaceholder || "Value (string or JSON)"}
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      // Remove all entries for this base key
                                      setCreateDataInEntries((prev) => {
                                        return prev.filter((entry) => {
                                          const langMatch = entry.key.match(/^(.+)_([a-z]{2})$/i)
                                          if (langMatch && langMatch[1] === baseKey) {
                                            return false
                                          }
                                          return entry.key !== baseKey
                                        })
                                      })
                                    }}
                                  >
                                    <IconX className="h-4 w-4" />
                                    <span className="sr-only">Remove</span>
                                  </Button>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>

                      {/* Raw JSON */}
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-start">Raw JSON</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void copyToClipboard(visibleCreateDataInRaw || "")
                            }}
                          >
                            <IconCopy className="me-2 h-4 w-4" />
                            {t?.copy ?? 'Copy'}
                          </Button>
                        </div>
                        <Textarea
                          value={visibleCreateDataInRaw}
                          onChange={(e) => setCreateDataInRaw(e.target.value)}
                          className="font-mono text-xs"
                          rows={10}
                        />
                        {createDataInRawError ? (
                          <div className="text-sm text-destructive">{createDataInRawError}</div>
                        ) : null}
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              try {
                                const parsed = JSON.parse(createDataInRaw || "{}")
                                const filtered = filterCustomDataInObject(parsed as Record<string, any>)
                                setCreateDataInEntries(objectToEntries(filtered))
                                setCreateDataInRawError(null)
                              } catch (e) {
                                setCreateDataInRawError(e instanceof Error ? e.message : String(e))
                              }
                            }}
                          >
                            {t.applyJson || "Apply JSON"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                {createError && (
                  <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {createError}
                  </div>
                )}
              </div>
              <div className="border-t px-6 py-4">
                <ResponsiveDialogFooter className="m-0">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    {t.form?.cancel || "Cancel"}
                  </Button>
                  <Button type="submit">{t.form?.create || "Create"}</Button>
                </ResponsiveDialogFooter>
              </div>
            </form>
            <ResponsiveDialogClose className="sr-only" />
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            // Clear edit data and price inputs when dialog closes
            setEditData({})
            setEditError(null)
            setRecordToEdit(null)
            setIsDuplicate(false)
            setEditFormTab("main")
            setEditDataInLanguage(locale)
            setEditDataInEntries([])
            setEditDataInRaw("{}")
            setEditDataInRawError(null)
            setPriceInputs((prev) => {
              const newInputs = { ...prev }
              schema.filter((f) => !isAutoGeneratedField(f.name, !!f.relation) && !f.primary && !f.hidden).forEach((field) => {
                if (field.fieldType === "price") {
                  delete newInputs[`edit-${field.name}`]
                }
              })
              return newInputs
            })
          }
        }}
        onlyDrawer
        direction="right"
        handleOnly
      >
        <ResponsiveDialogContent className="h-[calc(100svh-16px)] w-[560px] max-w-[95vw] overflow-hidden p-0 text-foreground" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
          <div className="flex h-full flex-col text-foreground">
            <div className="border-b px-6 py-4">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle className="text-foreground">
                  {isDuplicate
                    ? (t.createRecord?.title || "Create record in {collection}").replace("{collection}", collectionLabel)
                    : (t.editRecord?.title || "Edit record in {collection}").replace("{collection}", collectionLabel)
                  }
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="text-muted-foreground">
                  {isDuplicate
                    ? (t.createRecord?.description || "Fill in the fields below. Auto-generated fields are not editable and hidden.")
                    : (t.editRecord?.description || "Change fields below. Auto-generated fields are not editable and hidden.")
                  }
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
            </div>
            <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col text-foreground" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
              <div
                className={`min-h-0 flex-1 px-6 py-4 text-foreground [&_input[data-slot=input]]:bg-background! [&_input[data-slot=input]]:text-sm [&_textarea]:bg-background! [&_textarea]:text-sm **:data-[slot=select-trigger]:bg-background! **:data-[slot=select-trigger]:text-sm ${state.collection === "texts" && editFormTab === "content" ? "overflow-y-hidden" : "overflow-y-auto"}`}
                dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}
              >
                <Tabs
                  value={editFormTab}
                  onValueChange={(v) => setEditFormTab(v as any)}
                  className={`w-full ${state.collection === "texts" && editFormTab === "content" ? "flex h-full min-h-0 flex-col items-start" : ""}`}
                >
                  <TabsList className="mb-2">
                    <TabsTrigger value="main">{t.tabs?.main ?? "Main"}</TabsTrigger>
                    {state.collection === "roles" && <TabsTrigger value="info">{t.tabs?.info ?? "Info"}</TabsTrigger>}
                    {state.collection === "texts" && <TabsTrigger value="content">{t.tabs?.content ?? t?.fields?.texts?.content ?? "Content"}</TabsTrigger>}
                    {state.collection === "texts" && <TabsTrigger value="seo">{t.tabs?.seo ?? "SEO"}</TabsTrigger>}
                    <TabsTrigger value="details">{t.tabs?.details ?? "Details"}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="main" className="mt-0">
                    <div className="grid gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                      {schema.filter((f) => {
                        if (!isAutoGeneratedField(f.name, !!f.relation) && !f.primary && !f.hidden && f.name !== "data_in") {
                          if (state.collection === "roles") {
                            // For roles, show: title, name, description, is_system, order, xaid
                            return ["title", "name", "description", "is_system", "order", "xaid"].includes(f.name)
                          }
                          if (state.collection === "texts" && ["category", "content"].includes(f.name)) return false
                          if (state.collection === "texts" && ["data_in.seo_title", "data_in.seo_description", "data_in.seo_keywords", "data_in.slug"].includes(f.name)) return false
                          return true
                        }
                        return false
                      }).map((field) => (
                        <div key={field.name} className="flex flex-col gap-2 text-start">
                          {field.fieldType === "boolean" ? (
                            <div className="flex items-center gap-2 rtl:flex-row-reverse">
                              <Checkbox
                                id={`edit-field-${field.name}`}
                                checked={editData[field.name] === true}
                                onCheckedChange={(checked) => handleEditFieldChange(field.name, checked === true)}
                                disabled={field.readOnly}
                              />
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start cursor-pointer">
                                {getFieldLabel(field)}
                              </Label>
                            </div>
                          ) : field.fieldType === "date" || field.fieldType === "time" || field.fieldType === "datetime" ? (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <DateTimePicker
                                mode={field.fieldType}
                                value={editData[field.name] || null}
                                onChange={(date) => handleEditFieldChange(field.name, date)}
                                placeholder={(t.form?.select ?? "Select {field}").replace("{field}", getFieldLabel(field))}
                                disabled={field.readOnly}
                              />
                            </>
                          ) : field.fieldType === "phone" ? (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <PhoneInput
                                value={editData[field.name] || ""}
                                onChange={(value) => handleEditFieldChange(field.name, value || "")}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                                disabled={field.readOnly}
                              />
                            </>
                          ) : field.fieldType === "password" ? (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {` (${t.form?.passwordLeaveEmpty ?? "leave empty to keep current"})`}
                              </Label>
                              <Input
                                id={`edit-field-${field.name}`}
                                type="password"
                                value={editData[field.name] || ""}
                                onChange={(e) => handleEditFieldChange(field.name, e.target.value)}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                                minLength={8}
                                disabled={field.readOnly}
                              />
                              <Label htmlFor={`edit-field-${field.name}-confirm`} className="text-sm font-medium text-start">
                                {(t.form?.confirm ?? "Confirm {field}").replace("{field}", getFieldLabel(field))}
                              </Label>
                              <Input
                                id={`edit-field-${field.name}-confirm`}
                                type="password"
                                value={editData[`${field.name}_confirm`] || ""}
                                onChange={(e) => handleEditFieldChange(`${field.name}_confirm`, e.target.value)}
                                placeholder={(t.form?.confirm ?? "Confirm {field}").replace("{field}", getFieldLabel(field))}
                                minLength={8}
                                disabled={field.readOnly}
                              />
                              {editData[field.name] && editData[`${field.name}_confirm`] && editData[field.name] !== editData[`${field.name}_confirm`] && (
                                <p className="text-sm text-destructive">{t.form?.passwordsDoNotMatch || "Passwords do not match"}</p>
                              )}
                            </>
                          ) : (field.fieldType === "images" || field.name === "data_in.images") ? (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <MediaImagesPicker
                                value={Array.isArray(editData[field.name]) ? editData[field.name] : editData[field.name] ? [editData[field.name]] : []}
                                onChange={(urls) => handleEditFieldChange(field.name, urls)}
                                placeholder={(t.form?.select ?? "Select {field}").replace("{field}", getFieldLabel(field))}
                                disabled={field.readOnly}
                              />
                            </>
                          ) : (field.fieldType === "json" || field.fieldType === "tiptap") && getI18nJsonFieldsForCollection(state.collection).includes(field.name) ? (
                            <>
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                  {getFieldLabel(field)}
                                  {!field.nullable && <span className="text-destructive ms-1">*</span>}
                                </Label>
                                <Tabs
                                  value={jsonFieldLanguage[field.name] || locale}
                                  onValueChange={(value) => setJsonFieldLanguage((prev) => ({ ...prev, [field.name]: value as LanguageCode }))}
                                  className="w-auto"
                                >
                                  <TabsList className="h-8">
                                    {LANGUAGES.filter((l) => enabledLanguageCodes.includes(l.code)).map((l) => (
                                      <TabsTrigger key={l.code} value={l.code} className="text-xs px-2 py-1">
                                        {l.shortName}
                                      </TabsTrigger>
                                    ))}
                                  </TabsList>
                                </Tabs>
                              </div>
                              <Tabs
                                value={jsonFieldLanguage[field.name] || locale}
                                onValueChange={(value) => setJsonFieldLanguage((prev) => ({ ...prev, [field.name]: value as LanguageCode }))}
                                className="w-full"
                              >
                                {LANGUAGES.filter((l) => enabledLanguageCodes.includes(l.code)).map((l) => (
                                  <TabsContent key={l.code} value={l.code} className="mt-0">
                                    {field.fieldType === "tiptap" ? (
                                      <TipTapEditor
                                        content={editData[`${field.name}_${l.code}`] || ""}
                                        onChange={(html) => handleEditFieldChange(`${field.name}_${l.code}`, html)}
                                        placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", `${getFieldLabel(field)} (${l.name})`)}
                                      />
                                    ) : (
                                      <Input
                                        id={`edit-field-${field.name}_${l.code}`}
                                        type="text"
                                        required={!field.nullable}
                                        value={editData[`${field.name}_${l.code}`] || ""}
                                        onChange={(e) => handleEditFieldChange(`${field.name}_${l.code}`, e.target.value)}
                                        placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", `${getFieldLabel(field)} (${l.name})`)}
                                        disabled={field.readOnly}
                                      />
                                    )}
                                  </TabsContent>
                                ))}
                              </Tabs>
                            </>
                          ) : (field as any).fieldType === "price" ? (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Input
                                id={`edit-field-${field.name}`}
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                required={!field.nullable}
                                value={
                                  priceInputs[`edit-${field.name}`] !== undefined
                                    ? priceInputs[`edit-${field.name}`]
                                    : editData[field.name] === undefined || editData[field.name] === null
                                      ? ""
                                      : (Number(editData[field.name]) / 100).toFixed(2)
                                }
                                onChange={(e) => {
                                  let v = e.target.value.replace(/,/g, ".")
                                  setPriceInputs((prev) => ({ ...prev, [`edit-${field.name}`]: v }))
                                  if (v.includes(".")) {
                                    const [i, d] = v.split(".")
                                    v = `${i}.${d.slice(0, 2)}`
                                  }
                                  const num = v === "" ? NaN : Number(v)
                                  const cents = !isFinite(num) ? null : Math.round(num * 100)
                                  handleEditFieldChange(field.name, cents)
                                }}
                                onBlur={(e) => {
                                  let v = e.target.value.replace(/,/g, ".")
                                  if (v.includes(".")) {
                                    const [i, d] = v.split(".")
                                    v = `${i}.${d.slice(0, 2)}`
                                  }
                                  const num = v === "" ? NaN : Number(v)
                                  if (isFinite(num)) {
                                    const formatted = num.toFixed(2)
                                    setPriceInputs((prev) => ({ ...prev, [`edit-${field.name}`]: formatted }))
                                    const cents = Math.round(num * 100)
                                    handleEditFieldChange(field.name, cents)
                                  }
                                }}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                                disabled={field.readOnly}
                              />
                            </>
                          ) : field.fieldType === "select" && field.selectOptions ? (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <ComboboxSelect
                                id={`edit-field-${field.name}`}
                                options={field.selectOptions}
                                value={editData[field.name] || ""}
                                onValueChange={(value) => handleEditFieldChange(field.name, value)}
                                placeholder={(t.form?.select ?? "Select {field}").replace("{field}", getFieldLabel(field))}
                                disabled={field.readOnly}
                                required={!field.nullable}
                                translations={t}
                              />
                            </>
                          ) : field.fieldType === "enum" && field.enum ? (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Select
                                value={editData[field.name] || ""}
                                onValueChange={(value) => handleEditFieldChange(field.name, value)}
                                required={!field.nullable}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={(t.form?.select ?? "Select {field}").replace("{field}", getFieldLabel(field))} />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px] z-9999" position="popper" sideOffset={5}>
                                  {field.enum.values.map((val, index) => (
                                    <SelectItem key={val} value={val}>
                                      {field.enum!.labels[index] || val}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </>
                          ) : field.relation ? (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <RelationSelect
                                relation={field.relation}
                                value={editData[field.name]}
                                onChange={(value) => handleEditFieldChange(field.name, value)}
                                required={!field.nullable}
                                translations={t}
                                search={state.search}
                                locale={locale}
                              />
                            </>
                          ) : field.textarea ? (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Textarea
                                id={`edit-field-${field.name}`}
                                required={!field.nullable}
                                value={editData[field.name] || ""}
                                onChange={(e) => handleEditFieldChange(field.name, e.target.value)}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                                rows={6}
                              />
                            </>
                          ) : field.name === "description" ? (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Textarea
                                id={`edit-field-${field.name}`}
                                required={!field.nullable}
                                value={editData[field.name] || ""}
                                onChange={(e) => handleEditFieldChange(field.name, e.target.value)}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                                rows={4}
                              />
                            </>
                          ) : (
                            <>
                              <Label htmlFor={`edit-field-${field.name}`} className="text-sm font-medium text-start">
                                {getFieldLabel(field)}
                                {!field.nullable && <span className="text-destructive ms-1">*</span>}
                              </Label>
                              <Input
                                id={`edit-field-${field.name}`}
                                type={field.fieldType === "email" ? "email" : field.fieldType === "number" ? "number" : "text"}
                                required={!field.nullable}
                                value={editData[field.name] || ""}
                                onChange={(e) => handleEditFieldChange(field.name, e.target.value)}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field))}
                                disabled={field.readOnly}
                              />
                            </>
                          )}
                        </div>
                      ))}
                      
                      {/* Roles field for users collection */}
                      {state.collection === "users" && (
                        <div className="flex flex-col gap-2">
                          <Label className="text-start">{t?.fields?.roles?.plural ?? t?.roles ?? 'Roles'}</Label>
                          <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                aria-expanded={rolePopoverOpen}
                                disabled={rolesLoading}
                              >
                                <span className="truncate">
                                  {selectedRoles.length > 0
                                    ? selectedRoles.length === 1
                                      ? getRoleLabel(selectedRoles[0])
                                      : (t?.roles?.selected ?? 'Selected: {n}').replace('{n}', String(selectedRoles.length))
                                    : (t?.roles?.selectRoles ?? 'Select roles...')}
                                </span>
                                <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder={t?.roles?.searchRoles ?? 'Search roles...'} />
                                <CommandList>
                                  <CommandEmpty>{t?.roles?.noRolesFound ?? 'No roles found'}</CommandEmpty>
                                  <CommandGroup>
                                    {roles.map((role) => {
                                      const isSelected = (editData.roleUuids || []).includes(role.uuid)
                                      const roleLabel = getRoleLabel(role)
                                      return (
                                        <CommandItem
                                          key={role.uuid}
                                          value={`${roleLabel} ${role.uuid}`}
                                          onSelect={() => {
                                            const currentRoleUuids = editData.roleUuids || []
                                            const newRoleUuids = isSelected
                                              ? currentRoleUuids.filter((id: string) => id !== role.uuid)
                                              : [...currentRoleUuids, role.uuid]
                                            handleEditFieldChange('roleUuids', newRoleUuids)
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'me-2 h-4 w-4',
                                              isSelected ? 'opacity-100' : 'opacity-0'
                                            )}
                                          />
                                          {roleLabel}
                                          {role.isSystem && (
                                            <Badge variant="secondary" className="ms-2">
                                              {t?.fields?.roles?.is_system ?? 'System'}
                                            </Badge>
                                          )}
                                        </CommandItem>
                                      )
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {selectedRoles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selectedRoles.map((role) => (
                                <Badge key={role.uuid} variant="secondary">
                                  {getRoleLabel(role)}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentRoleUuids = editData.roleUuids || []
                                      handleEditFieldChange('roleUuids', currentRoleUuids.filter((id: string) => id !== role.uuid))
                                    }}
                                    className="ms-2 hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  {state.collection === "roles" && (
                    <TabsContent value="info" className="mt-0">
                      <div className="grid gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                        {schema.filter((f) => ["id", "uuid", "order", "created_at", "updated_at"].includes(f.name)).map((field) => {
                          const value = editData[field.name] ?? null
                          return (
                            <div key={field.name} className="flex flex-col gap-2 text-start">
                              <Label className="text-sm font-medium text-start select-text">
                                {getFieldLabel(field)}
                              </Label>
                              <div className="text-sm select-text">
                                {field.name === "created_at" || field.name === "updated_at" ? (
                                  <span className="select-text">
                                    {value ? formatDateTimeForLocale(value, locale) : "-"}
                                  </span>
                                ) : (
                                  <span className="select-text">
                                    {value ?? "-"}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>
                  )}
                  {state.collection === "texts" && (
                    <TabsContent value="content" className="mt-0 w-full flex-1 min-h-0 overflow-hidden">
                      <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-start">{t.editLanguage ?? "Language for editing"}</span>
                          <Tabs value={jsonFieldLanguage["content"] || locale} onValueChange={(v) => setJsonFieldLanguage((prev) => ({ ...prev, content: v as LanguageCode }))} className="w-auto">
                            <TabsList className="h-8">
                              {LANGUAGES.filter((l) => enabledLanguageCodes.includes(l.code)).map((l) => (
                                <TabsTrigger key={l.code} value={l.code} className="text-xs px-2 py-1">{l.shortName}</TabsTrigger>
                              ))}
                            </TabsList>
                          </Tabs>
                        </div>
                        {(() => {
                          const contentField = schema.find((f) => f.name === "content")
                          if (!contentField) return null
                          const contentLang = jsonFieldLanguage["content"] || locale
                          return (
                            <div className="flex h-full min-h-0 flex-col gap-2">
                              {contentField.fieldType === "tiptap" ? (
                                <div className="min-h-0 flex-1 [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-[32svh] [&_.tiptap-editor]:h-full [&_.tiptap-editor]:min-h-[32svh]">
                                  <TipTapEditor
                                    content={editData[`content_${contentLang}`] || ""}
                                    onChange={(html) => handleEditFieldChange(`content_${contentLang}`, html)}
                                    placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", `${getFieldLabel(contentField)} (${contentLang.toUpperCase()})`)}
                                  />
                                </div>
                              ) : (
                                <Textarea
                                  value={editData[`content_${contentLang}`] || ""}
                                  onChange={(e) => handleEditFieldChange(`content_${contentLang}`, e.target.value)}
                                  placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", `${getFieldLabel(contentField)} (${contentLang.toUpperCase()})`)}
                                  rows={16}
                                />
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </TabsContent>
                  )}
                  {state.collection === "texts" && (
                    <TabsContent value="seo" className="mt-0">
                      <div className="grid gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-start">{t.editLanguage ?? "Language for editing"}</span>
                          <Tabs value={jsonFieldLanguage["seo"] || locale} onValueChange={(v) => setJsonFieldLanguage((prev) => ({ ...prev, seo: v as LanguageCode }))} className="w-auto">
                            <TabsList className="h-8">
                              {LANGUAGES.filter((l) => enabledLanguageCodes.includes(l.code)).map((l) => (
                                <TabsTrigger key={l.code} value={l.code} className="text-xs px-2 py-1">{l.shortName}</TabsTrigger>
                              ))}
                            </TabsList>
                          </Tabs>
                        </div>
                        {["data_in.seo_title", "data_in.seo_description", "data_in.seo_keywords", "data_in.slug"].map((fieldName) => {
                          const field = schema.find((f) => f.name === fieldName)
                          if (!field) return null
                          const seoLang = jsonFieldLanguage["seo"] || locale
                          return (
                            <div key={fieldName} className="flex flex-col gap-2">
                              <Label className="text-sm font-medium text-start">
                                {getFieldLabel(field, fieldName)}
                              </Label>
                              <Input
                                value={editData[`${fieldName}_${seoLang}`] || ""}
                                onChange={(e) => handleEditFieldChange(`${fieldName}_${seoLang}`, e.target.value)}
                                placeholder={(t.form?.enter ?? "Enter {field}").replace("{field}", getFieldLabel(field, fieldName))}
                                disabled={field.readOnly}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>
                  )}
                  <TabsContent value="details" className="mt-0">
                    <div className="grid gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                      {/* Language tabs */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-start">{t.editLanguage ?? "Language for editing"}</div>
                        <Tabs
                          value={editDataInLanguage}
                          onValueChange={(value) => setEditDataInLanguage(value as LanguageCode)}
                          className="w-auto"
                        >
                          <TabsList className="h-8">
                            {LANGUAGES.filter((l) => enabledLanguageCodes.includes(l.code)).map((l) => (
                              <TabsTrigger key={l.code} value={l.code} className="text-xs px-2 py-1">
                                {l.shortName}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                      </div>

                      {/* Data_in fields */}
                      <div className="grid gap-4" dir={RTL_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Add a new entry with a temporary unique key
                              const tempKey = `new_field_${Date.now()}`
                              setEditDataInEntries((prev) => {
                                const newEntries = supportedLanguageCodes.map((lang) => ({
                                  key: `${tempKey}_${lang}`,
                                  title: "",
                                  value: "",
                                }))
                                return [...prev, ...newEntries]
                              })
                            }}
                          >
                            <IconPlus className="me-2 h-4 w-4" />
                            {t.addField ?? "Add field"}
                          </Button>
                        </div>
                        <div className="grid gap-3">
                          {(() => {
                            const rawKeys = getUniqueBaseKeys(editDataInEntries)
                            const uniqueBaseKeys = rawKeys.filter(isCustomDataInBaseKey)
                            if (uniqueBaseKeys.length === 0) {
                              return <div className="text-sm text-muted-foreground">{t?.noFields ?? 'No fields'}</div>
                            }
                            return uniqueBaseKeys.map((baseKey, idx) => {
                              const { title: currentTitle, value: currentValue } = getTitleAndValueForLanguage(editDataInEntries, baseKey, editDataInLanguage)
                              const tempKey = editKeyInputs[baseKey] ?? baseKey
                              const tempTitle = editTitleInputs[baseKey] ?? currentTitle
                              const tempValue = editValueInputs[baseKey] ?? currentValue

                              return (
                                <div key={`edit-entry-${baseKey}-${idx}`} className="flex gap-2 items-center">
                                  <Input
                                    value={tempKey}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      // Update only the temporary state, don't update entries yet
                                      setEditKeyInputs((prev) => ({
                                        ...prev,
                                        [baseKey]: v,
                                      }))
                                    }}
                                    onBlur={(e) => {
                                      const v = e.target.value.trim()
                                      if (!v || v === baseKey) {
                                        // Reset to original if empty or unchanged
                                        setEditKeyInputs((prev) => {
                                          const newState = { ...prev }
                                          delete newState[baseKey]
                                          return newState
                                        })
                                        return
                                      }
                                      // Update base key in all language entries
                                      setEditDataInEntries((prev) => {
                                        const result: DataInEntry[] = []
                                        const oldData: Record<string, { title: string; value: string }> = {}

                                        // Collect old title and value for all languages
                                        supportedLanguageCodes.forEach((lang) => {
                                          const oldLangKey = `${baseKey}_${lang}`
                                          const oldEntry = prev.find((e) => e.key === oldLangKey)
                                          if (oldEntry) {
                                            oldData[lang] = { title: oldEntry.title, value: oldEntry.value }
                                          }
                                        })

                                        // Keep entries that don't match this base key
                                        prev.forEach((entry) => {
                                          const langMatch = entry.key.match(/^(.+)_([a-z]{2})$/i)
                                          if (langMatch && langMatch[1] === baseKey) {
                                            return // Skip old entries for this base key
                                          }
                                          if (entry.key === baseKey) {
                                            return // Skip old entry without language suffix
                                          }
                                          result.push(entry)
                                        })

                                        // Add new entries with new base key
                                        supportedLanguageCodes.forEach((lang) => {
                                          result.push({
                                            key: `${v}_${lang}`,
                                            title: oldData[lang]?.title || "",
                                            value: oldData[lang]?.value || "",
                                          })
                                        })

                                        // Update temp key state with new base key
                                        setEditKeyInputs((prev) => {
                                          const newState = { ...prev }
                                          delete newState[baseKey]
                                          newState[v] = v
                                          return newState
                                        })

                                        return result
                                      })
                                    }}
                                    placeholder="Name (key)"
                                    className="flex-1"
                                  />
                                  <Input
                                    value={tempTitle}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      // Update only temporary state, don't update entries yet
                                      setEditTitleInputs((prev) => ({
                                        ...prev,
                                        [baseKey]: v,
                                      }))
                                    }}
                                    onBlur={(e) => {
                                      const v = e.target.value
                                      // Update title - duplicate to all languages if this is the first value entered
                                      setEditDataInEntries((prev) => {
                                        const allEmpty = supportedLanguageCodes.every((l) => {
                                          const { value } = getTitleAndValueForLanguage(prev, baseKey, l as LanguageCode)
                                          return !value || value.trim() === ""
                                        })

                                        const currentData = getTitleAndValueForLanguage(prev, baseKey, editDataInLanguage)
                                        return updateTitleAndValueForLanguage(prev, baseKey, editDataInLanguage, v, currentData.value, allEmpty && currentData.value.trim() !== "")
                                      })
                                      // Clear temp state
                                      setEditTitleInputs((prev) => {
                                        const newState = { ...prev }
                                        delete newState[baseKey]
                                        return newState
                                      })
                                    }}
                                    placeholder="Title"
                                    className="flex-1"
                                  />
                                  <Input
                                    value={tempValue}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      // Update only temporary state, don't update entries yet
                                      setEditValueInputs((prev) => ({
                                        ...prev,
                                        [baseKey]: v,
                                      }))
                                    }}
                                    onBlur={(e) => {
                                      const v = e.target.value
                                      // Update value - duplicate to all languages if this is the first value entered
                                      setEditDataInEntries((prev) => {
                                        // Check if this is the first value (all languages are empty)
                                        const allEmpty = supportedLanguageCodes.every((l) => {
                                          const { value } = getTitleAndValueForLanguage(prev, baseKey, l as LanguageCode)
                                          return !value || value.trim() === ""
                                        })

                                        const currentData = getTitleAndValueForLanguage(prev, baseKey, editDataInLanguage)
                                        return updateTitleAndValueForLanguage(prev, baseKey, editDataInLanguage, currentData.title, v, allEmpty && v.trim() !== "")
                                      })
                                      // Clear temp state
                                      setEditValueInputs((prev) => {
                                        const newState = { ...prev }
                                        delete newState[baseKey]
                                        return newState
                                      })
                                    }}
                                    placeholder={(translations as any)?.dataTable?.valuePlaceholder || "Value (string or JSON)"}
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      // Remove all entries for this base key
                                      setEditDataInEntries((prev) => {
                                        return prev.filter((entry) => {
                                          const langMatch = entry.key.match(/^(.+)_([a-z]{2})$/i)
                                          if (langMatch && langMatch[1] === baseKey) {
                                            return false
                                          }
                                          return entry.key !== baseKey
                                        })
                                      })
                                    }}
                                  >
                                    <IconX className="h-4 w-4" />
                                    <span className="sr-only">Remove</span>
                                  </Button>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>

                      {/* Raw JSON */}
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-start">Raw JSON</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void copyToClipboard(visibleEditDataInRaw || "")
                            }}
                          >
                            <IconCopy className="me-2 h-4 w-4" />
                            {t?.copy ?? 'Copy'}
                          </Button>
                        </div>
                        <Textarea
                          value={visibleEditDataInRaw}
                          onChange={(e) => setEditDataInRaw(e.target.value)}
                          className="font-mono text-xs"
                          rows={10}
                        />
                        {editDataInRawError ? (
                          <div className="text-sm text-destructive">{editDataInRawError}</div>
                        ) : null}
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              try {
                                const parsed = JSON.parse(editDataInRaw || "{}")
                                const filtered = filterCustomDataInObject(parsed as Record<string, any>)
                                setEditDataInEntries(objectToEntries(filtered))
                                setEditDataInRawError(null)
                              } catch (e) {
                                setEditDataInRawError(e instanceof Error ? e.message : String(e))
                              }
                            }}
                          >
                            {t.applyJson || "Apply JSON"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                {editError && (
                  <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {editError}
                  </div>
                )}
              </div>
              <div className="border-t px-6 py-4">
                <ResponsiveDialogFooter className="m-0">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    {t.form?.cancel || "Cancel"}
                  </Button>
                  <Button type="submit">{isDuplicate ? (t.form?.create || "Create") : (t.form?.save || "Save")}</Button>
                </ResponsiveDialogFooter>
              </div>
            </form>
            <ResponsiveDialogClose className="sr-only" />
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}

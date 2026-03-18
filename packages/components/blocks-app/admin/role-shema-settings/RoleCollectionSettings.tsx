"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { IconX } from "@tabler/icons-react"
import { getRoleSchemaAttribute } from "@/shared/types/role-schema-settings"
import type {
  RoleSchemaDataIn,
  RoleCabinetConfig,
  RoleCollectionConfig,
  RoleSchemaSetting,
  MultilangValue,
} from "@/shared/types/role-schema-settings"
import type { Role } from "@/shared/schema"
import { useQuery } from "@/hooks/api/useQuery"
import { useMutation } from "@/hooks/api/useMutation"
import { ADMINISTRATOR_ROLE, type DbFilters } from "@/shared/types/shared"
import { LANGUAGES } from "@/settings"
import { RoleCabinetSection } from "./RoleCabinetSection"
import { RoleCollectionCrudSettings } from "./RoleCollectionCrudSettings"
import { RoleCollectionColumnsSettings } from "./RoleCollectionColumnsSettings"
import { RoleCollectionOlapSettings } from "./RoleCollectionOlapSettings"
import { RoleCollectionConfigSettings } from "./RoleCollectionConfigSettings"
import { MultilangLocaleProvider } from "./MultilangLocaleContext"


function getRoleDisplayTitle(role: Role, locale: string): string {
  if (!role.title) return role.name ?? ""
  const title = role.title
  if (typeof title === "string") {
    try {
      const parsed = JSON.parse(title) as Record<string, string>
      return parsed[locale] ?? parsed.en ?? parsed.ru ?? parsed.rs ?? role.name ?? ""
    } catch {
      return title
    }
  }
  if (typeof title === "object" && title !== null) {
    const t = title as Record<string, string>
    return t[locale] ?? t.en ?? t.ru ?? t.rs ?? role.name ?? ""
  }
  return role.name ?? ""
}

interface RoleCollectionSettingsProps {
  initialRoleName?: string
  locale?: string
  supportedLanguageCodes?: string[]
  translations?: {
    cardTitle?: string
    cardDescription?: string
    role?: string
    loading?: string
    selectRole?: string
    noTitle?: string
    loadingSettings?: string
    collectionsLabel?: string
    collectionsPlaceholder?: string
    addCollection?: string
    activeCollection?: string
    cabinetSection?: string
    cabinetTitle?: string
    mainBreadcrumbsElementLabel?: string
    collectionTitle?: string
    base_url?: string
    redirectUrl?: string
    authRedirectUrl?: string
    settingsNotCreated?: string
    saving?: string
    save?: string
  }
}

const getDefaultDataIn = (roleName: string): RoleSchemaDataIn => ({
  roleName: roleName || undefined,
  collectionsConfig: [],
})

export function RoleCollectionSettings({
  initialRoleName = "",
  locale = "en",
  supportedLanguageCodes: supportedLanguageCodesProp,
  translations: t,
}: RoleCollectionSettingsProps) {
  const supportedLanguageCodes = supportedLanguageCodesProp ?? LANGUAGES.map((l) => l.code)
  const [selectedRoleName, setSelectedRoleName] = React.useState(initialRoleName)
  const [activeCollectionName, setActiveCollectionName] = React.useState<string | null>(null)
  const [newCollectionInput, setNewCollectionInput] = React.useState("")
  const [localDataIn, setLocalDataIn] = React.useState<RoleSchemaDataIn>(() =>
    getDefaultDataIn(initialRoleName)
  )
  const [error, setError] = React.useState<string | undefined>()
  const [setting, setSetting] = React.useState<RoleSchemaSetting | undefined>()

  const attribute = React.useMemo(
    () => (selectedRoleName ? getRoleSchemaAttribute(selectedRoleName) : ""),
    [selectedRoleName]
  )

  const getSettingFilters = React.useMemo<DbFilters>(
    (): DbFilters =>
      attribute
        ? { conditions: [{ field: "attribute", operator: "eq", values: [attribute] }] }
        : {},
    [attribute]
  )

  const {
    data: settingsResponse,
    loading: loadingSettings,
    refetch: refetchSettings,
  } = useQuery("getSetting", { filters: getSettingFilters }, { immediate: !!attribute })

  const createSettingMutation = useMutation("postSetting")
  const createAttemptedRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    const doc = (settingsResponse?.docs?.[0] ?? undefined) as RoleSchemaSetting | undefined
    if (doc) {
      setSetting(doc)
      if (attribute) createAttemptedRef.current.delete(attribute)
      return
    }
    const createdDoc = (createSettingMutation.data as { doc?: RoleSchemaSetting } | null)?.doc
    const hasCreatedForThisRole = createdDoc?.attribute === attribute
    if (!hasCreatedForThisRole) {
      setSetting(undefined)
    }
    const alreadyHaveSettingForRole = setting?.attribute === attribute
    if (
      !loadingSettings &&
      attribute &&
      !settingsResponse?.docs?.length &&
      !createSettingMutation.loading &&
      !alreadyHaveSettingForRole &&
      !createAttemptedRef.current.has(attribute)
    ) {
      createAttemptedRef.current.add(attribute)
      void createSettingMutation.execute({
        attribute,
        dataIn: getDefaultDataIn(selectedRoleName),
      })
    }
  }, [settingsResponse, loadingSettings, attribute, setting?.attribute, createSettingMutation.loading, createSettingMutation.data])

  React.useEffect(() => {
    const created = createSettingMutation.data as { doc?: RoleSchemaSetting } | null
    if (created?.doc) {
      setSetting(created.doc as RoleSchemaSetting)
      refetchSettings()
    }
  }, [createSettingMutation.data, refetchSettings])




  const { data: roleData, loading: loadingRoles, error: getRolesError } = useQuery("getRoles")
  const roles = (roleData?.docs ?? []) as Role[]
  const allowedRoles = React.useMemo(
    () => roles.filter((r) => r.name !== ADMINISTRATOR_ROLE),
    [roles]
  )

  React.useEffect(() => {
    if (initialRoleName) setSelectedRoleName(initialRoleName)
  }, [initialRoleName])

  const syncedSettingUuidRef = React.useRef<string | undefined>(undefined)
  React.useEffect(() => {
    if (!attribute) return
    if (setting?.attribute === attribute && setting?.dataIn) {
      if (syncedSettingUuidRef.current !== setting.uuid) {
        syncedSettingUuidRef.current = setting.uuid || undefined
        const raw = setting.dataIn as unknown as Record<string, unknown>
        const roleName: string =
          (typeof raw.roleName === "string" ? raw.roleName : selectedRoleName) || ""
        const payload: RoleSchemaDataIn = {
          roleName,
          collectionsConfig: (raw.collectionsConfig ?? undefined) as RoleSchemaDataIn["collectionsConfig"],
          cabinet: (raw.cabinet ?? undefined) as RoleSchemaDataIn["cabinet"],
          base_url: (raw.base_url ?? undefined) as string | undefined,
          auth_redirect_url: (raw.auth_redirect_url ?? undefined) as string | undefined,
        }
        setLocalDataIn(payload)
      }
    } else {
      syncedSettingUuidRef.current = undefined
      setLocalDataIn(getDefaultDataIn(selectedRoleName))
    }
  }, [attribute, setting?.uuid, setting?.attribute, setting?.dataIn, selectedRoleName])



  const saveMutation = useMutation("saveRoleSchemaSetting")

  const handleSave = React.useCallback(async () => {
    if (!setting?.uuid) return
    try {
      await saveMutation.execute({
        uuid: setting.uuid,
        dataIn: { ...localDataIn, roleName: selectedRoleName } as RoleSchemaDataIn,
      })
      const err = saveMutation.error
      if (err) throw err
      refetchSettings()
    } catch {
      // error state is in saveMutation.error
    }
  }, [setting?.uuid, localDataIn, selectedRoleName, saveMutation, refetchSettings])

  const saving = saveMutation.loading


  const setCabinet = React.useCallback(
    (cabinet: RoleSchemaSetting) => {
      setLocalDataIn((prev) => ({ ...prev, ...cabinet.dataIn }))
    },
    []
  )

  const currentCollections = React.useMemo(() => {
    const fromSetting = (setting?.dataIn as RoleSchemaDataIn)?.collectionsConfig ?? []
    const fromLocal = localDataIn.collectionsConfig ?? []
    return fromLocal.length > 0 ? fromLocal : fromSetting
  }, [setting?.dataIn, localDataIn.collectionsConfig])

  const setCollections = React.useCallback(
    (collections: RoleCollectionConfig[]) => {
      setLocalDataIn((prev) => ({ ...prev, collectionsConfig: collections }))
    },
    []
  )


  return (
    <Card>
      <CardHeader>
        <CardTitle>{t?.cardTitle ?? "Role & cabinet settings"}</CardTitle>
        <CardDescription>
          {t?.cardDescription ?? "Select a role and configure cabinet, collections, CRUD, columns and OLAP. Administrator is excluded."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t?.role ?? "Role"}</Label>
          <Select
            value={selectedRoleName}
            onValueChange={setSelectedRoleName}
            disabled={loadingRoles}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue
                placeholder={
                  loadingRoles ? (t?.loading ?? "Loading...") : (t?.selectRole ?? "Select role")
                }
              />
            </SelectTrigger>
            <SelectContent>
              {allowedRoles.map((role, index) => (
                <SelectItem
                  key={role.uuid}
                  value={(role.name || role.uuid || `role-${index}`).trim() || `role-${index}`}
                >
                  {getRoleDisplayTitle(role, locale) || (t?.noTitle ?? "No title")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {getRolesError != null && (
          <p className="text-sm text-destructive">
            {getRolesError instanceof Error ? getRolesError.message : String(getRolesError)}
          </p>
        )}

        {selectedRoleName && (
          <>
            {loadingSettings ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t?.loadingSettings ?? "Loading settings..."}</span>
              </div>
            ) : (
              <MultilangLocaleProvider supportedLanguageCodes={supportedLanguageCodes}>
              <div className="space-y-6">
                {/* Cabinet */}
                <div className="space-y-2">
                  <Label className="text-base">{t?.cabinetSection ?? "Cabinet"}</Label>
                  <RoleCabinetSection
                    cabinet={
                      setting
                        ? ({
                          ...setting,
                          dataIn: {
                            ...(setting.dataIn as RoleSchemaDataIn),
                            ...localDataIn,
                          },
                        } as RoleSchemaSetting)
                        : undefined
                    }
                    onChange={setCabinet}
                    supportedLanguageCodes={supportedLanguageCodes}
                    translations={{
                      cabinetTitle: t?.cabinetTitle,
                      mainBreadcrumbsElementLabel: t?.mainBreadcrumbsElementLabel,
                      base_url: t?.base_url,
                      redirectUrl: t?.redirectUrl,
                      authRedirectUrl: t?.authRedirectUrl,
                    }}
                  />
                </div>

                <CardHeader>
                  <CardTitle>{t?.cardTitle ?? "Role & cabinet settings"}</CardTitle>
                  <CardDescription>
                    {t?.cardDescription ?? "Select a role and configure cabinet, collections, CRUD, columns and OLAP. Administrator is excluded."}
                  </CardDescription>
                </CardHeader>
                <RoleCollectionConfigSettings
                  collections={currentCollections}
                  onChange={setCollections}
                  supportedLanguageCodes={supportedLanguageCodes}
                  translations={{
                    collectionsLabel: t?.collectionsLabel,
                    collectionsPlaceholder: t?.collectionsPlaceholder,
                  }}
                />
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t?.saving ?? "Saving..."}
                    </>
                  ) : (
                    t?.save ?? "Save"
                  )}
                </Button>
              </div>
              </MultilangLocaleProvider>
            )}
          </>
        )}

        {error != null && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}

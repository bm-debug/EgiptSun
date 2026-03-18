"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/packages/components/ui/input"
import type {
  MultilangValue,
  RoleSchemaSetting,
  RoleSchemaDataIn,
} from "@/shared/types/role-schema-settings"
import { MultilangTextInputs } from "./MultilangTextInputs"

export interface RoleCabinetSectionProps {
  cabinet: RoleSchemaSetting | null | undefined
  onChange: (cabinet: RoleSchemaSetting) => void
  supportedLanguageCodes: string[]
  translations?: { cabinetTitle?: string; mainBreadcrumbsElementLabel?: string; base_url?: string; redirectUrl?: string; authRedirectUrl?: string }
}

export function RoleCabinetSection({
  cabinet,
  onChange,
  supportedLanguageCodes,
  translations: t,
}: RoleCabinetSectionProps) {
  const dataIn = cabinet?.dataIn as RoleSchemaDataIn | undefined
  const cabinetConfig = dataIn

  const handleTitleChange = React.useCallback(
    (value: Record<string, string>) => {
      if (!cabinet?.dataIn) return
      const prev = cabinet.dataIn as RoleSchemaDataIn
      onChange({
        ...cabinet,
        dataIn: {
          ...prev,
          cabinet: { ...prev.cabinet, title: value },
        },
      })
    },
    [cabinet, onChange]
  )

  const handleMainBreadcrumbsElementLabelChange = React.useCallback(
    (value: Record<string, string>) => {
      if (!cabinet?.dataIn) return
      const prev = cabinet.dataIn as RoleSchemaDataIn
      onChange({
        ...cabinet,
        dataIn: {
          ...prev,
          cabinet: { ...prev.cabinet, main_breadcrumbs_element_label: value },
        },
      })
    },
    [cabinet, onChange]
  )

  const handleBaseUrlChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!cabinet?.dataIn) return
      const prev = cabinet.dataIn as RoleSchemaDataIn
      onChange({
        ...cabinet,
        dataIn: { ...prev, base_url: e.target.value },
      })
    },
    [cabinet, onChange]
  )

  const baseUrl = (cabinetConfig?.base_url ?? "").replace(/\/$/, "") || ""
  const fullAuthRedirect = cabinetConfig?.auth_redirect_url ?? ""
  const authRedirectSuffix =
    baseUrl && fullAuthRedirect.startsWith(baseUrl)
      ? fullAuthRedirect.slice(baseUrl.length).replace(/^\//, "")
      : fullAuthRedirect.replace(/^\//, "")

  const handleAuthRedirectUrlChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!cabinet?.dataIn) return
      const prev = cabinet.dataIn as RoleSchemaDataIn
      const suffix = e.target.value.replace(/^\//, "").trim()
      const full = baseUrl ? `${baseUrl}/${suffix}` : (suffix ? `/${suffix}` : "")
      onChange({
        ...cabinet,
        dataIn: { ...prev, auth_redirect_url: full || undefined },
      })
    },
    [cabinet, onChange, baseUrl]
  )

  // const handleRedirectUrlChange = React.useCallback(
  //   (e: React.ChangeEvent<HTMLInputElement>) => {
  //     onChange({ ...cabinetConfig, redirectUrlAfterLogin: e.target.value })
  //   },
  //   [cabinetConfig, onChange]
  // )

  return (
    <div className="space-y-4">
      <MultilangTextInputs
        value={cabinetConfig?.cabinet?.title}
        onChange={handleTitleChange}
        supportedLanguageCodes={supportedLanguageCodes}
        label={t?.cabinetTitle ?? "Cabinet title"}
        placeholder={t?.cabinetTitle ?? "Cabinet title"}
      />
      <MultilangTextInputs
        value={cabinetConfig?.cabinet?.main_breadcrumbs_element_label}
        onChange={handleMainBreadcrumbsElementLabelChange}
        supportedLanguageCodes={supportedLanguageCodes}
        label={t?.mainBreadcrumbsElementLabel ?? "Main breadcrumbs element label"}
        placeholder={t?.mainBreadcrumbsElementLabel ?? "Main breadcrumbs element label"}
      />
      <div className="space-y-2">
        <Label>{t?.base_url ?? "Base URL"}</Label>
        <Input
          value={cabinetConfig?.base_url ?? ""}
          onChange={handleBaseUrlChange}
          placeholder="/..."
          type="text"
        />
      </div>
      {baseUrl ? (
        <div className="space-y-2">
          <Label>{t?.authRedirectUrl ?? "Auth redirect URL"}</Label>
          <div className="flex rounded-md border shadow-xs">
            <span className="inline-flex items-center rounded-l-md border-r bg-muted px-3 text-muted-foreground md:text-sm">
              {baseUrl}/
            </span>
            <Input
              value={authRedirectSuffix}
              onChange={handleAuthRedirectUrlChange}
              placeholder="dashboard"
              type="text"
              className="rounded-l-none border-0 focus-visible:ring-0"
            />
          </div>
        </div>
      ) : null}
      {/* <div className="space-y-2">
        <Label>{t?.redirectUrl ?? "Redirect URL after login"}</Label>
        <Input
          value={cabinetConfig?.redirectUrlAfterLogin ?? ""}
          onChange={handleRedirectUrlChange}
          placeholder="/dashboard"
        />
      </div> */}
    </div>
  )
}

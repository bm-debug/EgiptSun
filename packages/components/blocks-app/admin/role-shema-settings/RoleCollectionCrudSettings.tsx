"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { RoleCollectionCrud } from "@/shared/types/role-schema-settings"

export interface RoleCollectionCrudSettingsProps {
  crud: RoleCollectionCrud | null | undefined
  onChange: (crud: RoleCollectionCrud) => void
  translations?: { read?: string; create?: string; update?: string; delete?: string }
}

export function RoleCollectionCrudSettings({
  crud,
  onChange,
  translations: t,
}: RoleCollectionCrudSettingsProps) {
  const handleChange = React.useCallback(
    (key: keyof RoleCollectionCrud, value: boolean) => {
      onChange({ ...crud, [key]: value })
    },
    [crud, onChange]
  )

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{t?.read ?? "CRUD actions"}</Label>
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={true} disabled />
          <Label className="text-sm font-normal">{t?.read ?? "Read"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={crud?.create ?? false}
            onCheckedChange={(v) => handleChange("create", v)}
          />
          <Label className="text-sm font-normal">{t?.create ?? "Create"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={crud?.update ?? false}
            onCheckedChange={(v) => handleChange("update", v)}
          />
          <Label className="text-sm font-normal">{t?.update ?? "Update"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={crud?.delete ?? false}
            onCheckedChange={(v) => handleChange("delete", v)}
          />
          <Label className="text-sm font-normal">{t?.delete ?? "Delete"}</Label>
        </div>
      </div>
    </div>
  )
}

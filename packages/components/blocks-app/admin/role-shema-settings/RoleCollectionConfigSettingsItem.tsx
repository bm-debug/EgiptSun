"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RoleCollectionConfig } from "@/shared/types/role-schema-settings"
import { formatCollectionToDisplayLabel } from "@/shared/utils/collection-display"
import { MultilangTextInputs } from "./MultilangTextInputs"

export interface RoleCollectionConfigSettingsItemProps {
  collectionConfig: RoleCollectionConfig
  onConfigChange: (config: RoleCollectionConfig) => void
  onRemove: () => void
  supportedLanguageCodes: string[]
}

export function RoleCollectionConfigSettingsItem({
  collectionConfig,
  onConfigChange,
  onRemove,
  supportedLanguageCodes,
}: RoleCollectionConfigSettingsItemProps) {
  const sortState = collectionConfig.__defaultSort?.[0]
  const sortId = sortState?.id ?? ""
  const sortDesc = sortState?.desc ?? false

  const handleTitleChange = React.useCallback(
    (value: Record<string, string>) => {
      onConfigChange({ ...collectionConfig, __title: value })
    },
    [collectionConfig, onConfigChange]
  )

  const handleSortIdChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const id = e.target.value
      onConfigChange({
        ...collectionConfig,
        __defaultSort: id ? [{ id, desc: sortDesc }] : undefined,
      })
    },
    [collectionConfig, sortDesc, onConfigChange]
  )

  const handleSortDirChange = React.useCallback(
    (value: string) => {
      const desc = value === "desc"
      onConfigChange({
        ...collectionConfig,
        __defaultSort: sortId
          ? [{ id: sortId, desc }]
          : collectionConfig.__defaultSort,
      })
    },
    [collectionConfig, sortId, onConfigChange]
  )

  return (
    <div className="rounded-lg border p-4 space-y-4 w-full max-w-md">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium truncate">
          {formatCollectionToDisplayLabel(collectionConfig.collectionName)}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Remove collection"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <MultilangTextInputs
          value={collectionConfig.__title}
          onChange={handleTitleChange}
          supportedLanguageCodes={supportedLanguageCodes}
          label="Title"
          placeholder="Collection title"
        />

      </div>
    </div>
  )
}

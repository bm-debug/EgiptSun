"use client"

import * as React from "react"
import type { RoleCollectionConfig } from "@/shared/types/role-schema-settings"
import { formatCollectionToDisplayLabel } from "@/shared/utils/collection-display"
import { RoleCollectionConfigSettingsItem } from "./RoleCollectionConfigSettingsItem"
import { ColumnFilterMultiselect } from "@/components/blocks-app/admin/data-table/ColumnFilterMultiselect"
import { useQuery } from "@/hooks/api/useQuery"
import { Label } from "@/components/ui/label"

export interface RoleCollectionConfigSettingsProps {
  collections?: RoleCollectionConfig[]
  onChange: (collections: RoleCollectionConfig[]) => void
  supportedLanguageCodes: string[]
  translations?: {
    collectionsLabel?: string
    collectionsPlaceholder?: string
  }
}

export function RoleCollectionConfigSettings({
  collections,
  onChange,
  supportedLanguageCodes,
  translations: t,
}: RoleCollectionConfigSettingsProps) {
  const { data: collectionsResponse } = useQuery("getCollections", undefined, { immediate: true })
  const options = React.useMemo(() => {
    const groups = collectionsResponse?.groups ?? []
    return groups.flatMap((g) =>
      g.collections.map((name) => ({
        value: name,
        label: formatCollectionToDisplayLabel(name),
      }))
    )
  }, [collectionsResponse])

  const selectedNames = React.useMemo(
    () => collections?.map((c) => c.collectionName) ?? [],
    [collections]
  )

  const configByName = React.useMemo(
    () => new Map(collections?.map((c) => [c.collectionName, c]) ?? []),
    [collections]
  )

  const handleSelectionChange = React.useCallback(
    (newSelected: string[]) => {
      const newCollections: RoleCollectionConfig[] = newSelected.map((name) => {
        const existing = configByName.get(name)
        return existing ?? { collectionName: name }
      })
      onChange(newCollections)
    },
    [configByName, onChange]
  )

  const handleConfigChange = React.useCallback(
    (collectionName: string, updated: RoleCollectionConfig) => {
      onChange(
        (collections ?? []).map((c) =>
          c.collectionName === collectionName ? updated : c
        )
      )
    },
    [collections, onChange]
  )

  const handleRemove = React.useCallback(
    (collectionName: string) => {
      onChange(
        (collections ?? []).filter((c) => c.collectionName !== collectionName)
      )
    },
    [collections, onChange]
  )

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        <Label>{t?.collectionsLabel ?? "Collections"}</Label>
        <ColumnFilterMultiselect
          options={options}
          value={selectedNames}
          onValueChange={handleSelectionChange}
          placeholder={t?.collectionsPlaceholder ?? "Select collections..."}
          triggerVariant="badges"
        />
      </div>
      <div className="flex flex-wrap gap-4">
        {collections?.map((config) => (
          <RoleCollectionConfigSettingsItem
            key={config.collectionName}
            collectionConfig={config}
            onConfigChange={(updated) =>
              handleConfigChange(config.collectionName, updated)
            }
            onRemove={() => handleRemove(config.collectionName)}
            supportedLanguageCodes={supportedLanguageCodes}
          />
        ))}
      </div>
    </div>
  )
}

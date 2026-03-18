"use client"

import * as React from "react"
import { Input } from "@/packages/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react"
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { OLAPSettings, OLAPTab } from "@/shared/collections/BaseCollection"
import { MultilangTextInputs } from "./MultilangTextInputs"

export interface RoleCollectionOlapSettingsProps {
  collectionName: string
  olap: OLAPSettings | null | undefined
  onChange: (olap: OLAPSettings) => void
  supportedLanguageCodes: string[]
  translations?: {
    addTab?: string
    id?: string
    collection?: string
    localKey?: string
    foreignKey?: string
    label?: string
  }
}

interface TabEditState {
  id: string
  collection: string
  localKey: string
  foreignKey: string
  labelByLocale: Record<string, string>
}

function parseTabs(tabs: OLAPTab[] | undefined): TabEditState[] {
  if (!tabs?.length) return []
  return tabs.map((tab) => ({
    id: tab.id,
    collection: tab.collection ?? "",
    localKey: tab.localKey ?? "",
    foreignKey: tab.foreignKey ?? "",
    labelByLocale: (() => {
      const v = tab.label
      if (v == null) return {}
      if (typeof v === "object" && !Array.isArray(v)) return { ...(v as Record<string, string>) }
      if (typeof v === "string") {
        try {
          const p = JSON.parse(v) as unknown
          return typeof p === "object" && p !== null && !Array.isArray(p) ? { ...(p as Record<string, string>) } : {}
        } catch {
          return {}
        }
      }
      return {}
    })(),
  }))
}

function tabsToOlap(tabs: TabEditState[]): OLAPSettings {
  return {
    tabs: tabs.map((t) => ({
      id: t.id,
      collection: t.collection,
      localKey: t.localKey,
      foreignKey: t.foreignKey,
      label: JSON.stringify(t.labelByLocale),
    })),
  }
}

function SortableTabRow({
  tab,
  index,
  supportedLanguageCodes,
  onChange,
  onRemove,
  t,
}: {
  tab: TabEditState
  index: number
  supportedLanguageCodes: string[]
  onChange: (tab: TabEditState) => void
  onRemove: () => void
  t?: RoleCollectionOlapSettingsProps["translations"]
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="rounded border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <IconGripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
        <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={onRemove}>
          <IconTrash className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t?.id ?? "ID"}</Label>
          <Input
            value={tab.id}
            onChange={(e) => onChange({ ...tab, id: e.target.value })}
            placeholder="tab-id"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t?.collection ?? "Collection"}</Label>
          <Input
            value={tab.collection}
            onChange={(e) => onChange({ ...tab, collection: e.target.value })}
            placeholder="collection"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t?.localKey ?? "Local key"}</Label>
          <Input
            value={tab.localKey}
            onChange={(e) => onChange({ ...tab, localKey: e.target.value })}
            placeholder="local_key"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t?.foreignKey ?? "Foreign key"}</Label>
          <Input
            value={tab.foreignKey}
            onChange={(e) => onChange({ ...tab, foreignKey: e.target.value })}
            placeholder="foreign_key"
          />
        </div>
      </div>
      <MultilangTextInputs
        value={tab.labelByLocale}
        onChange={(labelByLocale) => onChange({ ...tab, labelByLocale })}
        supportedLanguageCodes={supportedLanguageCodes}
        label={t?.label ?? "Label"}
      />
    </div>
  )
}

export function RoleCollectionOlapSettings({
  collectionName,
  olap,
  onChange,
  supportedLanguageCodes,
  translations: t,
}: RoleCollectionOlapSettingsProps) {
  const [tabs, setTabs] = React.useState<TabEditState[]>(() => parseTabs(olap?.tabs))

  React.useEffect(() => {
    setTabs(parseTabs(olap?.tabs))
  }, [olap?.tabs])

  const syncToParent = React.useCallback(
    (nextTabs: TabEditState[]) => {
      onChange(tabsToOlap(nextTabs))
    },
    [onChange]
  )

  const updateTab = React.useCallback(
    (index: number, nextTab: TabEditState) => {
      const next = [...tabs]
      next[index] = nextTab
      setTabs(next)
      syncToParent(next)
    },
    [tabs, syncToParent]
  )

  const removeTab = React.useCallback(
    (index: number) => {
      const next = tabs.filter((_, i) => i !== index)
      setTabs(next)
      syncToParent(next)
    },
    [tabs, syncToParent]
  )

  const addTab = React.useCallback(() => {
    const id = `tab-${Date.now()}`
    const newTab: TabEditState = {
      id,
      collection: collectionName,
      localKey: "",
      foreignKey: "",
      labelByLocale: {},
    }
    const next = [...tabs, newTab]
    setTabs(next)
    syncToParent(next)
  }, [collectionName, tabs, syncToParent])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id)
      const newIndex = tabs.findIndex((tab) => tab.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const next = arrayMove(tabs, oldIndex, newIndex)
      setTabs(next)
      syncToParent(next)
    },
    [tabs, syncToParent]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{t?.label ?? "OLAP tabs"}</Label>
        <Button variant="outline" size="sm" onClick={addTab}>
          <IconPlus className="h-4 w-4 mr-1" />
          {t?.addTab ?? "Add tab"}
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabs.map((tab) => tab.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tabs.map((tab, index) => (
              <SortableTabRow
                key={tab.id}
                tab={tab}
                index={index}
                supportedLanguageCodes={supportedLanguageCodes}
                onChange={(next) => updateTab(index, next)}
                onRemove={() => removeTab(index)}
                t={t}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {tabs.length === 0 && (
        <p className="text-sm text-muted-foreground">No OLAP tabs. Click &quot;Add tab&quot; to add one.</p>
      )}
    </div>
  )
}

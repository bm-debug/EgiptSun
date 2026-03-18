"use client"

import * as React from "react"
import { Input } from "@/packages/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { IconGripVertical, IconX } from "@tabler/icons-react"
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
import { useQuery } from "@/hooks/api/useQuery"
import type { RoleCollectionColumnsConfig } from "@/shared/types/role-schema-settings"

const EXCLUDED_COLUMN_IDS = new Set(["select", "actions"])

function useAvailableColumns(collectionName: string | null) {
  const { data } = useQuery(
    "getAdminState",
    { c: collectionName ?? "roles", ps: 200 },
    { immediate: !!collectionName }
  )

  const availableIds = React.useMemo(() => {
    if (!data?.schema?.columns) return []
    const fromSchema = (data.schema.columns as { name: string }[])
      .map((col) => col.name)
      .filter((id) => !EXCLUDED_COLUMN_IDS.has(id))
    const dataInKeys = new Set<string>()
    const rows = (data.data as unknown[]) ?? []
    for (const row of rows) {
      const r = row as Record<string, unknown>
      const dataIn = r.data_in ?? r.dataIn
      if (!dataIn) continue
      try {
        const parsed = typeof dataIn === "string" ? JSON.parse(dataIn) : dataIn
        if (parsed && typeof parsed === "object") {
          Object.keys(parsed).forEach((key) => {
            const base = key.replace(/_[a-z]{2}$/i, "")
            dataInKeys.add(`data_in.${base}`)
          })
        }
      } catch {
        // ignore
      }
    }
    const fromDataIn = Array.from(dataInKeys)
    const all = [...new Set([...fromSchema, ...fromDataIn])]
    return all
  }, [data])

  const columnNames = React.useMemo(() => {
    if (!data?.schema?.columns) return {}
    const names: Record<string, string> = {}
    for (const col of data.schema.columns as { name: string }[]) {
      names[col.name] = col.name
    }
    return names
  }, [data])

  return { availableIds, columnNames }
}

export interface RoleCollectionColumnsSettingsProps {
  collectionName: string | null
  columns: RoleCollectionColumnsConfig | null | undefined
  onChange: (columns: RoleCollectionColumnsConfig) => void
  translations?: { available?: string; selected?: string; search?: string; showColumn?: string }
}

function SortableColumnItem({
  id,
  title,
  visible,
  onVisibilityChange,
  onRemove,
  t,
}: {
  id: string
  title: string
  visible: boolean
  onVisibilityChange: (v: boolean) => void
  onRemove: () => void
  t?: { showColumn?: string }
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded border p-2">
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <IconGripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="flex-1 truncate text-sm">{title}</span>
      <Switch checked={visible} onCheckedChange={onVisibilityChange} />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
        <IconX className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function RoleCollectionColumnsSettings({
  collectionName,
  columns,
  onChange,
  translations: t,
}: RoleCollectionColumnsSettingsProps) {
  const [search, setSearch] = React.useState("")
  const { availableIds, columnNames } = useAvailableColumns(collectionName)

  const selected = React.useMemo(() => columns?.selected ?? [], [columns?.selected])
  const order = React.useMemo(() => columns?.order ?? selected, [columns?.order, selected])
  const visibility = React.useMemo(() => columns?.visibility ?? {}, [columns?.visibility])

  const orderedSelected = React.useMemo(() => {
    if (order.length > 0) {
      const orderSet = new Set(order)
      const inOrder = order.filter((id) => selected.includes(id))
      const rest = selected.filter((id) => !orderSet.has(id))
      return [...inOrder, ...rest]
    }
    return selected
  }, [order, selected])

  const availableToAdd = React.useMemo(() => {
    const selectedSet = new Set(selected)
    const list = availableIds.filter((id) => !selectedSet.has(id))
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter((id) => id.toLowerCase().includes(q) || (columnNames[id] ?? "").toLowerCase().includes(q))
  }, [availableIds, selected, search, columnNames])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleAdd = React.useCallback(
    (id: string) => {
      const nextSelected = [...selected, id]
      const nextOrder = [...order, id]
      onChange({
        selected: nextSelected,
        order: nextOrder,
        visibility: { ...visibility, [id]: true },
      })
    },
    [selected, order, visibility, onChange]
  )

  const handleRemove = React.useCallback(
    (id: string) => {
      const nextSelected = selected.filter((x) => x !== id)
      const nextOrder = order.filter((x) => x !== id)
      const nextVisibility = { ...visibility }
      delete nextVisibility[id]
      onChange({ selected: nextSelected, order: nextOrder, visibility: nextVisibility })
    },
    [selected, order, visibility, onChange]
  )

  const handleVisibilityChange = React.useCallback(
    (id: string, visible: boolean) => {
      onChange({ ...columns, visibility: { ...visibility, [id]: visible } } as RoleCollectionColumnsConfig)
    },
    [columns, visibility, onChange]
  )

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = orderedSelected.indexOf(active.id as string)
      const newIndex = orderedSelected.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return
      const nextOrder = arrayMove(orderedSelected, oldIndex, newIndex)
      onChange({ ...columns, order: nextOrder, selected } as RoleCollectionColumnsConfig)
    },
    [orderedSelected, columns, selected, onChange]
  )

  if (!collectionName) {
    return (
      <p className="text-sm text-muted-foreground">
        {t?.selected ?? "Select a collection to configure columns."}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>{t?.available ?? "Available columns"}</Label>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t?.search ?? "Search..."}
          className="mb-2"
        />
        <div className="max-h-48 overflow-y-auto space-y-1 rounded border p-2">
          {availableToAdd.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {selected.length >= availableIds.length ? "All columns added" : "No matches"}
            </p>
          ) : (
            availableToAdd.map((id) => (
              <div key={id} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-muted">
                <span className="text-sm truncate">{columnNames[id] ?? id}</span>
                <Button variant="outline" size="sm" onClick={() => handleAdd(id)}>
                  Add
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t?.selected ?? "Selected columns (drag to reorder)"}</Label>
        <div className="max-h-48 overflow-y-auto space-y-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedSelected} strategy={verticalListSortingStrategy}>
              {orderedSelected.map((id) => (
                <SortableColumnItem
                  key={id}
                  id={id}
                  title={columnNames[id] ?? id}
                  visible={visibility[id] !== false}
                  onVisibilityChange={(v) => handleVisibilityChange(id, v)}
                  onRemove={() => handleRemove(id)}
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>
          {orderedSelected.length === 0 && (
            <p className="text-sm text-muted-foreground">No columns selected</p>
          )}
        </div>
      </div>
    </div>
  )
}

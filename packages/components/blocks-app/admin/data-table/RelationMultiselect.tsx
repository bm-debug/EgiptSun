import type { AdminFilter } from "@/shared/types"
import type { RelationConfig, StateResponse } from "./types"
import React from 'react'
import qs from "qs"

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from "@/components/ui/command"
  import { Button } from "@/components/ui/button"
  import { Check, ChevronsUpDown } from "lucide-react"
  import { IconCheck } from "@tabler/icons-react"
  
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"

// Relation Multiselect Component (for column filters)
export function RelationMultiselect({
    relation,
    value,
    onChange,
    disabled,
    translations,
    locale = 'en',
  }: {
    relation: RelationConfig
    value: string | string[] | null
    onChange: (value: string[] | null) => void
    disabled?: boolean
    translations?: any
    locale?: string
  }) {
    const [options, setOptions] = React.useState<Array<{ value: any; label: string }>>([])
    const [loading, setLoading] = React.useState(false)
    const [open, setOpen] = React.useState(false)
  
    // Convert value to array
    const selectedValues = React.useMemo(() => {
      if (!value) return []
      if (Array.isArray(value)) return value.map(v => String(v))
      return [String(value)]
    }, [value])
  
    React.useEffect(() => {
      const loadOptions = async () => {
        setLoading(true)
        try {
          const relationFilters: AdminFilter[] = []
          if (Array.isArray(relation.filters)) {
            relationFilters.push(...relation.filters)
          }
  
          const queryParams = qs.stringify({
            c: relation.collection,
            p: 1,
            ps: 1000,
            ...(relationFilters.length > 0 && { filters: relationFilters }),
          }, {
            arrayFormat: 'brackets',
            encode: false,
          })
  
          const res = await fetch(`/api/admin/state?${queryParams}`, {
            credentials: "include",
          })
          if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
          
          const json: StateResponse = await res.json()
          
          const opts = json.data.map((item) => {
            const val = item[relation.valueField]
            let label: string
            
            if (relation.collection === 'taxonomy' && relation.labelField === 'title') {
              let titleValue = item[relation.labelField]
              
              if (typeof titleValue === 'string') {
                try {
                  titleValue = JSON.parse(titleValue)
                } catch {
                  // Not JSON, use as-is
                }
              }
              
              if (titleValue && typeof titleValue === 'object') {
                label = titleValue[locale] || titleValue.en || titleValue.ru || titleValue.rs || titleValue.ar || "-"
              } else {
                label = String(titleValue || "-")
              }
            } else {
              label = relation.labelFields
                ? relation.labelFields.map(f => item[f]).filter(Boolean).join(" ")
                : String(item[relation.labelField] || "-")
            }
            
            return { value: val, label }
          })
          
          setOptions(opts)
        } catch (e) {
          console.error(`[RelationMultiselect] Failed to load options for ${relation.collection}:`, e)
        } finally {
          setLoading(false)
        }
      }
  
      loadOptions()
    }, [relation, locale])
  
    const selectedOptions = options.filter(opt => selectedValues.includes(String(opt.value)))
    const t = translations?.dataTable || translations
  
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-7 text-xs"
            disabled={disabled || loading}
          >
            <span className="truncate">
              {selectedOptions.length > 0
                ? `${selectedOptions.length} ${t?.form?.selected || "selected"}`
                : (t?.form?.selectPlaceholder || "Select...")}
            </span>
            {selectedOptions.length === 0 && (
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-10002" align="start">
          <Command>
            <CommandInput placeholder={t?.search || "Search..."} className="h-8" />
            <CommandList>
              <CommandEmpty>{t?.form?.noResults || "No results found."}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(String(option.value))
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => {
                        if (isSelected) {
                          const newValues = selectedValues.filter((v) => v !== String(option.value))
                          onChange(newValues.length > 0 ? newValues : null)
                        } else {
                          onChange([...selectedValues, String(option.value)])
                        }
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        {isSelected && <IconCheck className="h-4 w-4 ml-auto" />}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          {selectedValues.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onChange(null)}
              >
                {t?.form?.clear || "Clear"}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  }
  
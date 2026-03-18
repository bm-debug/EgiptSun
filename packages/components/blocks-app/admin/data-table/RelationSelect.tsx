import { AdminFilter } from "@/shared/types"
import { RelationConfig, StateResponse } from "./types"
import * as React from "react"
import qs from "qs"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Relation Select Component
export function RelationSelect({
  relation,
  value,
  onChange,
  disabled,
  required,
  translations,
  locale = 'en',
  search,
}: {
  relation: RelationConfig
  value: any
  onChange: (value: any) => void
  disabled?: boolean
  required?: boolean
  translations?: any
  search?: string
  locale?: string
}) {
  const [options, setOptions] = React.useState<Array<{ value: any; label: string }>>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const loadOptions = async () => {
      setLoading(true)
      try {
        // Get current user for template replacement
        let userHumanAid: string | null = null
        if (relation.collection === 'products' && relation.filters?.some((f: any) => typeof f.value === 'string' && f.value.includes('{{user.humanAid}}'))) {
          try {
            const userRes = await fetch('/api/auth/me', { credentials: 'include' })
            if (userRes.ok) {
              const userData = await userRes.json() as { humanAid?: string }
              userHumanAid = userData?.humanAid || null
            }
          } catch (err) {
            console.error('[RelationSelect] Failed to fetch user:', err)
          }
        }

        // Compose relation filters: defaults from schema
        const relationFilters: AdminFilter[] = []
        if (Array.isArray(relation.filters)) {
          relationFilters.push(...relation.filters.map((f: any) => {
            // Replace template variables
            if (typeof f.value === 'string' && f.value.includes('{{user.humanAid}}')) {
              return { ...f, value: f.value.replace('{{user.humanAid}}', userHumanAid || '') }
            }
            return f
          }).filter((f: any) => f.value !== '')) // Remove filters with empty values
        }
        const queryParams = qs.stringify({
          c: relation.collection,
          p: 1,
          ps: 1000, // Load more items for select
          ...(relation.inheritSearch && search && { s: search }),
          ...(relationFilters.length > 0 && { filters: relationFilters }),
        }, {
          arrayFormat: 'brackets', // Use brackets format for arrays: filters[0][field]=entity
          encode: false, // Don't encode, let browser handle it
        })

        const res = await fetch(`/api/admin/state?${queryParams}`, {
          credentials: "include",
        })
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`)

        const json: StateResponse = await res.json()

                
        const opts = json.data.map((item) => {
          const value = item[relation.valueField]
          let label: string
          
          // If labelField is 'title' and collection is 'taxonomy', parse JSON
          if (relation.collection === 'taxonomy' && relation.labelField === 'title') {
            let titleValue = item[relation.labelField]
            
            // Parse JSON if it's a string
            if (typeof titleValue === 'string') {
              try {
                titleValue = JSON.parse(titleValue)
              } catch {
                // Not JSON, use as-is
              }
            }
            
            // Extract locale-specific value
            if (titleValue && typeof titleValue === 'object') {
              label = titleValue[locale] || titleValue.en || titleValue.ru || titleValue.rs || titleValue.ar || "-"
            } else {
              label = String(titleValue || "-")
            }
          } else if (relation.collection === 'products' && relation.labelField === 'title') {
            // Handle products title which might be JSON
            let titleValue = item[relation.labelField]
            if (typeof titleValue === 'string') {
              try {
                titleValue = JSON.parse(titleValue)
              } catch {
                // Not JSON, use as-is
              }
            }
            if (typeof titleValue === 'object' && titleValue !== null) {
              label = titleValue[locale] || titleValue.en || titleValue.ru || titleValue.rs || titleValue.ar || String(titleValue) || "-"
            } else {
              label = String(titleValue || "-")
            }
          } else {
            // Regular field handling
            label = relation.labelFields
              ? relation.labelFields.map(f => item[f]).filter(Boolean).join(" ")
              : String(item[relation.labelField] || "-")
          }
          
          return { value, label }
        })


        setOptions(opts)
      } catch (e) {
        console.error(`[RelationSelect] Failed to load options for ${relation.collection}:`, e)
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [relation, search, locale])

  return (
    <Select value={value ? String(value) : ""} onValueChange={(val) => {
      // Convert string back to original value type if needed
      // For relation fields, we want to preserve the original value type (could be string or number)
      const originalValue = options.find(opt => String(opt.value) === val)?.value
      // Always use the original value from options if found, otherwise use the string value
      // This ensures we pass the actual ID, not a string representation
      const finalValue = originalValue !== undefined ? originalValue : val
      // Ensure we never pass an object - only primitives (string, number, null)
      if (typeof finalValue === 'object' && finalValue !== null) {
        console.warn('[RelationSelect] Attempted to pass object value, using null instead:', finalValue)
        onChange(null)
      } else {
        onChange(finalValue)
      }
    }} disabled={disabled || loading} required={required}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? (translations?.form?.loading || "Loading...") : (translations?.form?.selectPlaceholder || "Select...")} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] z-10002" position="popper" sideOffset={5}>
        {options.length === 0 && !loading ? (
          <div className="p-2 text-sm text-muted-foreground">{(translations as any)?.form?.noOptionsAvailable || "No options available"}</div>
        ) : (
          options.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

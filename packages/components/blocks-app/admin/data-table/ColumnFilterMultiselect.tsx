import * as React from "react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"


import { cn } from "@/lib/utils"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { Button } from "@/components/ui/button"

import { Check, ChevronsUpDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type ColumnFilterMultiselectTriggerVariant = "count" | "badges"

export function ColumnFilterMultiselect({
  options,
  value,
  onValueChange,
  placeholder,
  translations,
  triggerVariant = "count",
}: {
  options: Array<{ value: string; label: string }>
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  translations?: any
  triggerVariant?: ColumnFilterMultiselectTriggerVariant
}) {
  const [open, setOpen] = React.useState(false)

  const selectedValues = Array.isArray(value) ? value : []
  const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value))
  const t = translations?.dataTable || translations

  const handleRemove = (e: React.MouseEvent, valueToRemove: string) => {
    e.stopPropagation()
    onValueChange(selectedValues.filter((v) => v !== valueToRemove))
  }

  const triggerContent =
    triggerVariant === "badges" && selectedOptions.length > 0 ? (
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {selectedOptions.map((opt) => (
          <Badge
            key={opt.value}
            variant="secondary"
            className="gap-1 pr-1 py-0.5 font-normal"
            onClick={(e) => e.stopPropagation()}
          >
            {opt.label}
            <button
              type="button"
              aria-label={(t?.form?.removeOption ?? "Remove {label}").replace("{label}", opt.label)}
              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
              onClick={(e) => handleRemove(e, opt.value)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    ) : (
      <span className="truncate">
        {selectedOptions.length > 0
          ? `${selectedOptions.length} ${t?.form?.selected || "selected"}`
          : placeholder || t?.form?.selectPlaceholder || "Select..."}
      </span>
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-9 text-xs"
        >
          {triggerContent}
          {(selectedOptions.length === 0 || triggerVariant === "badges") && (
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0 z-10002" align="start">
        <Command>
          <CommandInput placeholder={t?.search || "Search..."} className="h-8" />
          <CommandList>
            <CommandEmpty>{t?.form?.noResults || "No results found."}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => {
                      if (isSelected) {
                        onValueChange(selectedValues.filter((v) => v !== option.value))
                      } else {
                        onValueChange([...selectedValues, option.value])
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

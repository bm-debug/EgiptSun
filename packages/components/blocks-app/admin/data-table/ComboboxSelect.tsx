import * as React from "react"

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

import { cn } from "@/lib/utils"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"
// Combobox Component for select fields with search
export function ComboboxSelect({
    options,
    value,
    onValueChange,
    placeholder,
    disabled,
    required,
    id,
    translations,
  }: {
    options: Array<{ value: string; label: string }>
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    required?: boolean
    id?: string
    translations?: any
  }) {
    const [open, setOpen] = React.useState(false)
  
    const selectedOption = options.find((opt) => opt.value === value)
  
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedOption ? selectedOption.label : placeholder || "Select..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0 z-10002" align="start">
          <Command>
            <CommandInput placeholder={placeholder || "Search..."} />
            <CommandList>
              <CommandEmpty>{(translations as any)?.form?.noResults || "No results found."}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => {
                      onValueChange(option.value === value ? "" : option.value)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
  
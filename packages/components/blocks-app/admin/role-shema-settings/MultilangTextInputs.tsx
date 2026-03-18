"use client"

import * as React from "react"
import { Input } from "@/packages/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { MultilangValue } from "@/shared/types/role-schema-settings"
import { useMultilangLocale } from "./MultilangLocaleContext"

export interface MultilangTextInputsProps {
  value: MultilangValue | null | undefined
  onChange: (value: Record<string, string>) => void
  supportedLanguageCodes: string[]
  label?: string
  placeholder?: string
}

export function MultilangTextInputs({
  value,
  onChange,
  supportedLanguageCodes,
  label,
  placeholder,
}: MultilangTextInputsProps) {
  const parsed = React.useMemo((): Record<string, string> => {
    if (value == null) return {}
    if (typeof value === "object" && !Array.isArray(value)) return { ...value }
    if (typeof value === "string") {
      try {
        const p = JSON.parse(value) as unknown
        return typeof p === "object" && p !== null && !Array.isArray(p) ? { ...(p as Record<string, string>) } : {}
      } catch {
        return {}
      }
    }
    return {}
  }, [value])

  const localeContext = useMultilangLocale()
  const firstCode = supportedLanguageCodes[0] ?? "en"
  const [localActiveCode, setLocalActiveCode] = React.useState(firstCode)

  const activeCode = localeContext?.activeCode ?? localActiveCode
  const setActiveCode = localeContext?.setActiveCode ?? setLocalActiveCode
  const codes = localeContext?.supportedLanguageCodes ?? supportedLanguageCodes

  React.useEffect(() => {
    if (!codes.includes(activeCode) && codes.length > 0) {
      setActiveCode(codes[0])
    }
  }, [activeCode, codes, setActiveCode])

  const currentValue = parsed[activeCode] ?? ""

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...parsed, [activeCode]: e.target.value })
    },
    [onChange, parsed, activeCode]
  )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {label && <Label className="shrink-0">{label}</Label>}
        <div className="inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground h-8">
          {codes.map((code) => (
            <button
              key={code}
              type="button"
              data-state={activeCode === code ? "active" : "inactive"}
              onClick={() => setActiveCode(code)}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                "bg-transparent data-[state=inactive]:bg-transparent data-[state=inactive]:min-h-[inherit]",
                "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow data-[state=active]:min-h-[inherit]",
                "text-xs px-2 py-1"
              )}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <Input
        value={currentValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  )
}

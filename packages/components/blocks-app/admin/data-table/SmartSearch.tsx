"use client"

import * as React from "react"
import { IconSearch, IconX } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/packages/components/ui/input"
import { cn } from "@/lib/utils";


interface SmartSearchProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  classNameWrapper?: string
  classNameIcon?: string
  classNameContainer?: string
  classNameBadge?: string
  classNameButton?: string
  classNameInput?: string
}

export function SmartSearch({
  value = "",
  onChange,
  placeholder,
  className,
  classNameWrapper,
  classNameIcon,
  classNameContainer,
  classNameBadge,
  classNameButton,
  classNameInput,
}: SmartSearchProps) {
  const [searchInput, setSearchInput] = React.useState("")
  const [badges, setBadges] = React.useState<string[]>([])
  const lastSyncedValueRef = React.useRef<string>("")

  // Sync internal state with external value
  React.useEffect(() => {
    // Only update if value changed externally (not from our onChange)
    if (value !== lastSyncedValueRef.current) {
      lastSyncedValueRef.current = value
      if (value) {
        // Split by OR (case-sensitive) and trim each badge
        const newBadges = value
          .split('OR')
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
        setBadges(newBadges)
        setSearchInput("")
      } else {
        setBadges([])
        setSearchInput("")
      }
    }
  }, [value])

  // Update search string and call onChange
  const updateSearchString = React.useCallback(() => {
    const badgesToJoin = [...badges]
    if (searchInput.trim()) {
      badgesToJoin.push(searchInput.trim())
    }
    const searchString = badgesToJoin.join("OR")
    lastSyncedValueRef.current = searchString
    onChange?.(searchString)
  }, [badges, searchInput, onChange])

  const handleRemoveBadge = React.useCallback(
    (idx: number) => {
      const newBadges = badges.filter((_, i) => i !== idx)
      setBadges(newBadges)
      // Update search string immediately when badge is removed
      const searchString = newBadges.join("OR")
      lastSyncedValueRef.current = searchString
      onChange?.(searchString)
    },
    [badges, onChange]
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && searchInput.trim()) {
        e.preventDefault()
        // Split input by OR (case-sensitive) and trim each badge
        const inputBadges = searchInput
          .split('OR')
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
        const newBadges = [...badges, ...inputBadges]
        setBadges(newBadges)
        setSearchInput("")
        // Update search string
        const searchString = newBadges.join("OR")
        lastSyncedValueRef.current = searchString
        onChange?.(searchString)
      }
    },
    [searchInput, badges, onChange]
  )

  const handleBlur = React.useCallback(() => {
    if (searchInput.trim()) {
      // Split input by OR (case-sensitive) and trim each badge
      const inputBadges = searchInput
        .split('OR')
        .map((b) => b.trim())
        .filter((b) => b.length > 0)
      const newBadges = [...badges, ...inputBadges]
      setBadges(newBadges)
      setSearchInput("")
      // Update search string
      const searchString = newBadges.join("OR")
      lastSyncedValueRef.current = searchString
      onChange?.(searchString)
    } else {
      // Even if input is empty, update to reflect current badges
      updateSearchString()
    }
  }, [searchInput, badges, onChange, updateSearchString])

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <div className={cn(
        "relative flex items-center gap-1 min-h-9 rounded-md border bg-card px-3 py-1 shadow-xs",
        classNameWrapper
      )}>
        <IconSearch className={cn("size-4 shrink-0 text-muted-foreground", classNameIcon)} />
        <div className={cn("flex flex-wrap items-center gap-1 flex-1 min-w-0", classNameContainer)}>
          {badges.map((badge, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className={cn("text-xs px-2 py-0.5 h-6 flex items-center gap-1 shrink-0", classNameBadge)}
            >
              <span>{badge}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveBadge(idx)
                }}
                className={cn("ml-1 hover:bg-muted rounded-full p-0.5 -mr-1", classNameButton)}
              >
                <IconX className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            type="text"
            placeholder={badges.length === 0 ? placeholder || "" : ""}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(
              "border-0 p-0 h-auto flex-1 min-w-[120px] focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent",
              classNameInput
            )}
          />
        </div>
      </div>
    </div>
  )
}

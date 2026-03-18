"use client"

import * as React from "react"

interface MultilangLocaleContextValue {
  activeCode: string
  setActiveCode: (code: string) => void
  supportedLanguageCodes: string[]
}

const MultilangLocaleContext = React.createContext<
  MultilangLocaleContextValue | null
>(null)

export interface MultilangLocaleProviderProps {
  supportedLanguageCodes: string[]
  children: React.ReactNode
}

export function MultilangLocaleProvider({
  supportedLanguageCodes,
  children,
}: MultilangLocaleProviderProps) {
  const firstCode = supportedLanguageCodes[0] ?? "en"
  const [activeCode, setActiveCode] = React.useState(firstCode)

  React.useEffect(() => {
    if (
      !supportedLanguageCodes.includes(activeCode) &&
      supportedLanguageCodes.length > 0
    ) {
      setActiveCode(supportedLanguageCodes[0])
    }
  }, [activeCode, supportedLanguageCodes])

  const value = React.useMemo<MultilangLocaleContextValue>(
    () => ({
      activeCode,
      setActiveCode,
      supportedLanguageCodes,
    }),
    [activeCode, supportedLanguageCodes]
  )

  return (
    <MultilangLocaleContext.Provider value={value}>
      {children}
    </MultilangLocaleContext.Provider>
  )
}

export function useMultilangLocale(): MultilangLocaleContextValue | null {
  return React.useContext(MultilangLocaleContext)
}

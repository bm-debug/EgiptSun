'use client'

import * as React from 'react'

interface ConsumerHeaderContextValue {
  title: string | null
  breadcrumbItems: Array<{ label: string; href?: string }> | null
  setTitle: (title: string | null) => void
  setBreadcrumbItems: (items: Array<{ label: string; href?: string }> | null) => void
}

const ConsumerHeaderContext = React.createContext<ConsumerHeaderContextValue | null>(null)

export function ConsumerHeaderProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitleState] = React.useState<string | null>(null)
  const [breadcrumbItems, setBreadcrumbItemsState] = React.useState<Array<{ label: string; href?: string }> | null>(null)

  // Stabilize setter functions with useCallback
  const setTitle = React.useCallback((newTitle: string | null) => {
    setTitleState((prev) => {
      if (prev === newTitle) return prev
      return newTitle
    })
  }, [])

  const setBreadcrumbItems = React.useCallback((newItems: Array<{ label: string; href?: string }> | null) => {
    setBreadcrumbItemsState((prev) => {
      // Deep comparison for arrays
      if (prev === newItems) return prev
      if (!prev && !newItems) return prev
      if (!prev || !newItems) return newItems
      if (prev.length !== newItems.length) return newItems
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].label !== newItems[i].label || prev[i].href !== newItems[i].href) {
          return newItems
        }
      }
      return prev
    })
  }, [])

  return (
    <ConsumerHeaderContext.Provider
      value={{
        title,
        breadcrumbItems,
        setTitle,
        setBreadcrumbItems,
      }}>
      {children}
    </ConsumerHeaderContext.Provider>
  )
}

export function useConsumerHeader() {
  const context = React.useContext(ConsumerHeaderContext)
  if (!context) {
    throw new Error('useConsumerHeader must be used within ConsumerHeaderProvider')
  }
  return context
}


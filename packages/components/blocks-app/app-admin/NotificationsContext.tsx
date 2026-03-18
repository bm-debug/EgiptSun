"use client"

import * as React from "react"

interface NotificationsContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const NotificationsContext = React.createContext<NotificationsContextValue>({
  open: false,
  setOpen: () => {},
})

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return (
    <NotificationsContext.Provider value={{ open, setOpen }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return React.useContext(NotificationsContext)
}


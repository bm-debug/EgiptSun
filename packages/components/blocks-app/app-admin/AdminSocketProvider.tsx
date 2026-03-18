"use client"

import * as React from "react"
import { createContext, useContext, useCallback, useRef, ReactNode } from "react"

export type AdminSocketEvent = {
  type: string
  [key: string]: unknown
}

type AdminSocketEventHandlers = Map<string, Set<(event: AdminSocketEvent) => void>>

const AdminSocketContext = createContext<{
  subscribe: (eventType: string, handler: (event: AdminSocketEvent) => void) => () => void
  emit: (event: AdminSocketEvent) => void
}>({
  subscribe: () => () => {},
  emit: () => {},
})

export function AdminSocketProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<AdminSocketEventHandlers>(new Map())

  const subscribe = useCallback((eventType: string, handler: (event: AdminSocketEvent) => void) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set())
    }
    
    handlersRef.current.get(eventType)!.add(handler)

    // Return unsubscribe function
    return () => {
      const handlers = handlersRef.current.get(eventType)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          handlersRef.current.delete(eventType)
        }
      }
    }
  }, [])

  const emit = useCallback((event: AdminSocketEvent) => {
    const handlers = handlersRef.current.get(event.type)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event)
        } catch (error) {
          console.error(`Error in handler for event type "${event.type}":`, error)
        }
      })
    }
  }, [])

  const value = React.useMemo(
    () => ({ subscribe, emit }),
    [subscribe, emit]
  )

  return (
    <AdminSocketContext.Provider value={value}>
      {children}
    </AdminSocketContext.Provider>
  )
}

export function useAdminSocket() {
  return useContext(AdminSocketContext)
}

/**
 * Hook to subscribe to specific admin socket event types
 * @param eventType - The event type to listen for (e.g., "support-chat-created")
 * @param handler - Handler function that will be called when event is received
 * @param deps - Optional dependency array for the handler
 */
export function useAdminSocketEvent(
  eventType: string,
  handler: (event: AdminSocketEvent) => void,
  deps: React.DependencyList = []
) {
  const { subscribe } = useAdminSocket()
  const handlerRef = useRef(handler)

  // Update handler ref when it changes
  React.useEffect(() => {
    handlerRef.current = handler
  }, [handler, ...deps])

  React.useEffect(() => {
    const wrappedHandler = (event: AdminSocketEvent) => {
      handlerRef.current(event)
    }

    const unsubscribe = subscribe(eventType, wrappedHandler)
    return unsubscribe
  }, [eventType, subscribe])
}


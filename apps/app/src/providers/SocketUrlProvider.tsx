"use client"

import { createContext, useContext, ReactNode, useEffect } from "react"

const SocketUrlContext = createContext<string | undefined>(undefined)

export function SocketUrlProvider({ 
  children,
  socketUrl 
}: { 
  children: ReactNode
  socketUrl?: string 
}) {
  // Fallback to environment variable if not provided
  const url = socketUrl || process.env.NEXT_PUBLIC_SOCKET_URL

  // Debug: log the URL value (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {

    }
  }, [url])

  return (
    <SocketUrlContext.Provider value={url}>
      {children}
    </SocketUrlContext.Provider>
  )
}

export function useSocketUrl() {
  const url = useContext(SocketUrlContext)
  
  // Debug: log when hook is used (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useSocketUrl] Current URL:', url || 'undefined')
    }
  }, [url])
  
  return url
}

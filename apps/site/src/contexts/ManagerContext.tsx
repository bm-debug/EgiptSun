'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Employee = {
  eaid: string
  fullEaid: string | null
  email: string | null
  statusName: string | null
}

type Human = {
  haid: string
  fullName: string | null
}

type Location = {
  laid: string
  fullLaid: string | null
  title: string | null
  city: string | null
  type: string | null
}

type User = {
  id: number
  email: string
  uuid: string
}

export type ManagerData = {
  user: User | null
  employee: Employee | null
  human: Human | null
  location: Location | null
}

type ManagerContextType = {
  data: ManagerData
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ManagerContext = createContext<ManagerContextType | undefined>(undefined)

export function ManagerProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ManagerData>({
    user: null,
    employee: null,
    human: null,
    location: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/store/v2/m/me', {
        credentials: 'include',
      })

      const body = await response.json() as { error?: string }

      if (!response.ok) {
        throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
      }

      const result = body as ManagerData
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch manager data:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchData()

    // Fetch every 60 seconds
    const interval = setInterval(() => {
      fetchData()
    }, 60000)

    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <ManagerContext.Provider value={{ data, loading, error, refetch: fetchData }}>
      {children}
    </ManagerContext.Provider>
  )
}

export function useManager() {
  const context = useContext(ManagerContext)
  if (context === undefined) {
    throw new Error('useManager must be used within a ManagerProvider')
  }
  return context
}


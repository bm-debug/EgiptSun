'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'
import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface ConsumerAuthGuardProps {
  children: ReactNode
}

export default function ConsumerAuthGuard({ children }: ConsumerAuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  // Redirect to login
  const redirectToLogin = () => {
    try {
      document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    } catch {}
    router.replace('/login')
  }

  // Check if current user has consumer role
  const checkUserAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (!response.ok) {
        redirectToLogin()
        return false
      }

      const data: { user: { roles: { name: string }[] } } = await response.json()

      // Check if user has Consumer role or is admin (for development)
      const hasConsumerRole = data.user.roles.some((role) => {
        if (!role.name) return false
        const normalized = role.name.toLowerCase()
        return normalized === 'consumer' || normalized === 'потребитель' || normalized === 'client'
      })
      const isAdmin = data.user.roles.some((role) => role.name === 'Administrator')

      // Allow admin access to consumer cabinet for testing
      return hasConsumerRole || isAdmin
    } catch (err) {
      console.error('Auth check failed:', err)
      redirectToLogin()
      return false
    }
  }

  // Initial check - only on mount, not on every pathname change
  const hasCheckedRef = useRef(false)
  const isCheckingRef = useRef(false)

  useEffect(() => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current || hasCheckedRef.current) return

    const checkAuth = async () => {
      if (isCheckingRef.current) return
      isCheckingRef.current = true

      try {
        // Check if current user has consumer role
        const isAuthorized = await checkUserAuth()
        if (!isAuthorized) {
          isCheckingRef.current = false
          return
        }

        setChecking(false)
        hasCheckedRef.current = true
      } catch (err) {
        console.error('Failed to check auth:', err)
        redirectToLogin()
      } finally {
        isCheckingRef.current = false
      }
    }

    checkAuth()
  }, [router])

  // Periodic auth check (every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      checkUserAuth()
    }, 60000) // 60 seconds = 1 minute

    // Cleanup interval on unmount
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Return children directly without wrapper to preserve component identity
  return children
}


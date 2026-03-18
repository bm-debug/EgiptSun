'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'
import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface InvestorAuthGuardProps {
  children: ReactNode
}

export default function InvestorAuthGuard({ children }: InvestorAuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  const redirectToLogin = () => {
    try {
      document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    } catch {}
    router.replace('/login')
  }

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

      const hasInvestorRole = data.user.roles.some(
        (role) => role.name === 'Investor' || role.name === 'Инвестор'
      )
      const isAdmin = data.user.roles.some((role) => role.name === 'Administrator')

      return hasInvestorRole || isAdmin
    } catch (err) {
      console.error('Auth check failed:', err)
      redirectToLogin()
      return false
    }
  }

  const hasCheckedRef = useRef(false)
  const isCheckingRef = useRef(false)

  useEffect(() => {
    if (isCheckingRef.current || hasCheckedRef.current) return

    const checkAuth = async () => {
      if (isCheckingRef.current) return
      isCheckingRef.current = true

      try {
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

  useEffect(() => {
    const interval = setInterval(() => {
      checkUserAuth()
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return children
}


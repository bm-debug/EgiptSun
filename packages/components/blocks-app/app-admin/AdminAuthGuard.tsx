"use client"

import { useEffect, useState, useRef, ReactNode } from "react"
import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useRoomSocket } from "@/hooks/use-user-socket"
import { useAdminSocket } from "@/packages/components/blocks-app/app-admin/AdminSocketProvider"

interface AdminAuthGuardProps {
  children: ReactNode
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const { emit } = useAdminSocket()

  // Redirect to login
  const redirectToLogin = () => {
    try {
      document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    } catch {}
    router.replace('/login')
  }

  // Check if current user is still admin
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

      return data.user.roles.some((role) => role.name === 'Administrator' || role.name === 'admin')
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
        const currentPath = window.location.pathname
        
        // If on create-new-user page, skip auth checks
        if (currentPath === '/admin/create-new-user' || currentPath === '/admin/create-new-user/' ||
            currentPath === '/m/create-new-user' || currentPath === '/m/create-new-user/') {
          setChecking(false)
          hasCheckedRef.current = true
          isCheckingRef.current = false
          return
        }

        // Check if users exist - handle 404 gracefully
        let hasUsers = true
        try {
          const checkResponse = await fetch('/api/auth/check-users')
          if (checkResponse.ok) {
            const checkData: { hasUsers: boolean } = await checkResponse.json()
            hasUsers = checkData.hasUsers
          } else if (checkResponse.status === 404) {
            // API endpoint not found, assume users exist and proceed
            console.warn('check-users endpoint not found, proceeding with auth check')
            hasUsers = true
          }
        } catch (fetchErr) {
          // Network error or other issue, assume users exist and proceed
          console.warn('Failed to check users, proceeding with auth check:', fetchErr)
          hasUsers = true
        }
        
        if (!hasUsers) {
          // No users exist, redirect to create first user
          // Use current path prefix (/admin or /m)
          const prefix = currentPath.startsWith('/m') ? '/m' : '/admin'
          location.href = `${prefix}/create-new-user`
          isCheckingRef.current = false
          return
        }
        
        // Check if current user is admin
        const isAdminResult = await checkUserAuth()
        if (!isAdminResult) {
          isCheckingRef.current = false
          return
        }
        
        setIsAdmin(true)
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

  // Subscribe to admin room socket when admin is authenticated
  useRoomSocket(
    isAdmin && !checking ? "admin" : "",
    {
      'update-admin': (data: { type: string; [key: string]: unknown }) => {
        // Emit event through context so pages can subscribe to specific event types
        emit(data)
      }
    }
  )

  // Periodic auth check (every minute) - skip for create-new-user page
  useEffect(() => {
    if (pathname === '/admin/create-new-user' || pathname === '/admin/create-new-user/' ||
        pathname === '/m/create-new-user' || pathname === '/m/create-new-user/') {
      return
    }

    const interval = setInterval(async () => {
      const isAdminResult = await checkUserAuth()
      setIsAdmin(isAdminResult)
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


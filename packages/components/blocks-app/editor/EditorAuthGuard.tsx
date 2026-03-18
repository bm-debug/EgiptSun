"use client"

import { useEffect, useState, useRef, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

interface EditorAuthGuardProps {
  children: ReactNode
}

export default function EditorAuthGuard({ children }: EditorAuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const mountedRef = useRef(true)

  // Redirect to login
  const redirectToLogin = () => {
    try {
      document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    } catch {}
    router.replace('/login')
  }

  // Check if current user is editor or admin
  const checkUserAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      const body = await response.json() as any

      if (!response.ok) {
        redirectToLogin()
        return false
      }

      const data: { user: { roles: { name: string }[] } } = body

      console.log('[EditorAuthGuard] User roles:', data.user.roles.map(r => r.name))

      // Allow both Editor and Administrator roles (check both cases)
      const hasAccess = data.user.roles.some((role) => 
        role.name === 'Editor' || 
        role.name === 'editor' || 
        role.name === 'Administrator' ||
        role.name === 'administrator'
      )
      
      console.log('[EditorAuthGuard] Has access:', hasAccess)
      
      return hasAccess
    } catch (err) {
      console.error('Auth check failed:', err)
      redirectToLogin()
      return false
    }
  }

  // Initial check
  useEffect(() => {
    mountedRef.current = true
    const checkAuth = async () => {
      const isAuthorized = await checkUserAuth()
      if (!mountedRef.current) return
      if (!isAuthorized) {
        console.log('[EditorAuthGuard] User not authorized, redirecting...')
        redirectToLogin()
        return
      }
      console.log('[EditorAuthGuard] User authorized, showing content')
      setChecking(false)
    }

    checkAuth()
    return () => {
      mountedRef.current = false
    }
  }, [pathname])

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}


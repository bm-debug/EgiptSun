"use client"

import { useEffect, useCallback, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useMe } from "@/providers/MeProvider"

interface RoleAuthGuardProps {
  children: ReactNode
  allowedRoles?: string[]
  redirectTo?: string
}

export default function RoleAuthGuard({
  children,
  allowedRoles = [],
  redirectTo = "/login",
}: RoleAuthGuardProps) {
  const router = useRouter()
  const { user, loading } = useMe()

  const redirect = useCallback(() => {
    try {
      document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    } catch { }
    router.replace(redirectTo)
  }, [router, redirectTo])

  useEffect(() => {
    if (loading) {
      return
    }

    if (!user) {
      redirect()
      return
    }

    // Determine if user is admin (has any system role)

    const roleNames = user.roles
      .map((r) => r.name)
      .filter((v): v is string => Boolean(v))

    const roleAllowed = allowedRoles.length
      ? allowedRoles.some((r) => roleNames.includes(r))
      : false

    if (!roleAllowed) {
      redirect()
    }
  }, [user, loading, allowedRoles, redirect])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}



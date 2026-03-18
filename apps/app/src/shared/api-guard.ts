
import { buildRequestEnv } from '@/shared/env'
import { getSession, isAdmin } from '@/shared/session'
import { MeRepository } from '@/shared/repositories/me.repository'
import type { AuthenticatedContext, Context, Env, RequestContext } from '@/shared/types'

export type AuthenticatedRequestContext = Context & {
  user: NonNullable<Awaited<ReturnType<MeRepository['findByIdWithRoles']>>>
}

type RouteHandler<T extends Context = Context> = (context: T) => Promise<Response>

export function withRoleGuard<T extends Context>(handler: RouteHandler<T>, checkRole: (user: any) => boolean) {
  return async (request: Request, props?: { params?: Promise<Record<string, string>> }) => {
    const env = buildRequestEnv()
    
    // Check auth secret
    if (!env.AUTH_SECRET) {
      console.error('AUTH_SECRET not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'INTERNAL_SERVER_ERROR', 
          message: 'Authentication not configured' 
        }),
        { 
          status: 500, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

    const sessionUser = await getSession(request, env.AUTH_SECRET)
    if (!sessionUser?.id) {
       return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'UNAUTHORIZED', 
          message: 'Unauthorized' 
        }),
        { 
          status: 401, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

    

    const meRepo = MeRepository.getInstance()
    const user = await meRepo.findByIdWithRoles(Number(sessionUser.id))
    
    if (!user) {
       return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'UNAUTHORIZED', 
          message: 'User not found' 
        }),
        { 
          status: 401, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

    // Check if user is active
    if (!user.user.isActive || user.user.deletedAt) {
      return new Response(JSON.stringify({ error: 'User account inactive or deleted' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if user has allowed role using the checkRole callback
    if (!checkRole(user)) {
       return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'FORBIDDEN', 
          message: 'Forbidden: Insufficient permissions' 
        }),
        { 
          status: 403, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

    const resolvedParams = props?.params ? await props.params : undefined
    
    const context = {
        request,
        env,
        params: resolvedParams,
        user
    } as unknown as T

    try {
      return await handler(context)
    } catch (error) {
      console.error(`[withRoleGuard] Handler error:`, error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      
      return new Response(JSON.stringify({
        success: false,
        error: 'HANDLER_ERROR',
        message: errorMessage,
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      })
    }
  }
}

export function withAdminGuard<T extends Context>(handler: RouteHandler<T>) {
  return withRoleGuard(handler, (user) => isAdmin(user))
}
export function withSuperAdminGuard<T extends Context>(handler: RouteHandler<T>) {
  return withAllowedRoleGuard(handler,['Administrator'])
}
export function withClientGuard<T extends Context>(handler: RouteHandler<T>) {
  return withAllowedRoleGuard(handler,['client'])
}

export function withInvestorGuard<T extends Context>(handler: RouteHandler<T>) {
  return withAllowedRoleGuard(handler,['investor'])
}

export function withTesterGuard<T extends Context>(handler: RouteHandler<T>) {
  return withAllowedRoleGuard(handler, ['tester', 'Тестер'])
}

export function withAdministratorGuard<T extends Context>(handler: RouteHandler<T>) {
  return withAllowedRoleGuard(handler, ['administrator', 'Администратор'])
}

export function withManagerGuard<T extends Context>(handler: RouteHandler<T>) {
  return withRoleGuard(handler, (userWithRoles: any) => {
    // Logic from original middleware
    const { roles } = userWithRoles
    const isSystemAdmin = roles.some((role: any) => role.name === 'Administrator' )
    const allowedRoleNames = ['Administrator', 'manager']
    const allowedRaids = ['Administrator', 'r-manag1']
    const userRoleNames = roles.map((r: any) => r.name).filter(Boolean)
    const userRaids = roles.map((r: any) => r.raid).filter(Boolean)
    const hasRoleAccess = userRoleNames.some((name: string) => allowedRoleNames.includes(name)) ||
                         userRaids.some((raid: string) => allowedRaids.includes(raid))

    return isSystemAdmin || hasRoleAccess
  })
}

export function withStorekeeperGuard<T extends Context>(handler: RouteHandler<T>) {
  return withRoleGuard(handler, (userWithRoles: any) => {
    const { roles } = userWithRoles
    const isSystemAdmin = roles.some((role: any) => role.name === 'Administrator')
    const allowedRoleNames = ['Administrator', 'storekeeper']
    const allowedRaids = ['Administrator', 'r-store1']
    const userRoleNames = roles.map((r: any) => r.name).filter(Boolean)
    const userRaids = roles.map((r: any) => r.raid).filter(Boolean)
    const hasRoleAccess = userRoleNames.some((name: string) => allowedRoleNames.includes(name)) ||
                         userRaids.some((raid: string) => allowedRaids.includes(raid))

    return isSystemAdmin || hasRoleAccess
  })
}

export function withEditorGuard<T extends Context>(handler: RouteHandler<T>) {
  return withRoleGuard(handler, (userWithRoles: any) => {
    const { roles } = userWithRoles
    const isSystemAdmin = roles.some((role: any) => role.isSystem === true)
    // Allow both Administrator and Editor roles (check both name and raid)
    const allowedRoleNames = ['Administrator', 'administrator', 'Editor', 'editor']
    const allowedRaids = ['Administrator', 'editor', 'r-edito1']
    const userRoleNames = roles.map((r: any) => r.name).filter(Boolean)
    const userRaids = roles.map((r: any) => r.raid).filter(Boolean)
    const hasRoleAccess = userRoleNames.some((name: string) => allowedRoleNames.includes(name)) ||
                         userRaids.some((raid: string) => allowedRaids.includes(raid))

    console.log('[withEditorGuard] Checking access:', {
      isSystemAdmin,
      userRoleNames,
      userRaids,
      hasRoleAccess,
      allowedRoleNames,
      allowedRaids
    })

    return isSystemAdmin || hasRoleAccess
  })
}

export function withAllowedRoleGuard<T extends RequestContext>(handler: RouteHandler<T>, allowedRoles: string[]) {
  return async (request: Request, props?: { params?: Promise<Record<string, string>> }) => {
    const env = buildRequestEnv()
    
    // Check auth secret
    if (!env.AUTH_SECRET) {
      console.error('AUTH_SECRET not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'INTERNAL_SERVER_ERROR', 
          message: 'Authentication not configured' 
        }),
        { 
          status: 500, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

    const session = await getSession(request, env.AUTH_SECRET)
    if (!session?.id) {
       return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'UNAUTHORIZED', 
          message: 'Unauthorized' 
        }),
        { 
          status: 401, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

    const meRepo = MeRepository.getInstance()
    const user = await meRepo.findByIdWithRoles(Number(session.id))
    
    if (!user) {
       return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'UNAUTHORIZED', 
          message: 'User not found' 
        }),
        { 
          status: 401, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

    // Check if user has any of the allowed roles
    // Also check role titles (for i18n support) and case-insensitive matching
    const userRoleNames = user.roles.map(r => r.name).filter(Boolean)
    const userRoleTitles = user.roles.map(r => {
      if (r.title) {
        try {
          const title = typeof r.title === 'string' ? JSON.parse(r.title) : r.title
          if (typeof title === 'object' && title !== null) {
            return title.ru || title.en || title.rs || null
          }
          return typeof title === 'string' ? title : null
        } catch {
          return typeof r.title === 'string' ? r.title : null
        }
      }
      return null
    }).filter(Boolean)
    
    // Check role names (case-insensitive) and titles
    const hasAllowedRole = user.roles.some(r => {
      if (!r.name) return false
      const roleNameLower = r.name.toLowerCase()
      return allowedRoles.some(allowed => {
        const allowedLower = allowed.toLowerCase()
        // Check exact match
        if (roleNameLower === allowedLower) return true
        // Check if role title matches (for "Разработчик" = "developer")
        if (r.title) {
          try {
            const title = typeof r.title === 'string' ? JSON.parse(r.title) : r.title
            const titleStr = typeof title === 'object' && title !== null 
              ? (title.ru || title.en || title.rs || '')
              : (typeof title === 'string' ? title : '')
            if (titleStr.toLowerCase().includes(allowedLower) || allowedLower.includes(titleStr.toLowerCase())) {
              return true
            }
          } catch {
            // Ignore parse errors
          }
        }
        return false
      })
    })
    
    
    if (!hasAllowedRole) {
       console.warn('[withAllowedRoleGuard] Access denied:', {
         allowedRoles,
         userRoleNames,
         userRoleTitles,
         userId: user.id,
         allRoles: user.roles.map(r => ({
           name: r.name,
           title: r.title,
           uuid: r.uuid,
         })),
       })
       return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'FORBIDDEN', 
          message: 'Forbidden: Insufficient permissions' 
        }),
        { 
          status: 403, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

    const resolvedParams = props?.params ? await props.params : undefined
    
    const context = {
        request,
        env,
        params: resolvedParams,
        user
    } as unknown as T

    return handler(context)
  }
}
/**
 * Guard для доступа всем аутентифицированным пользователям кроме админа
 * Используется для эндпоинтов, которые должны быть доступны клиентам и инвесторам, но не админам
 */
export function withNonAdminGuard<T extends RequestContext>(handler: RouteHandler<T>) {
  return async (request: Request, props?: { params?: Promise<Record<string, string>> }) => {
    const env = buildRequestEnv()
    
    // Check auth secret
    if (!env.AUTH_SECRET) {
      console.error('AUTH_SECRET not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'INTERNAL_SERVER_ERROR', 
          message: 'Authentication not configured' 
        }),
        { 
          status: 500, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

    const session = await getSession(request, env.AUTH_SECRET)
    if (!session?.id) {
       return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'UNAUTHORIZED', 
          message: 'Unauthorized' 
        }),
        { 
          status: 401, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

    const meRepo = MeRepository.getInstance()
    const user = await meRepo.findByIdWithRoles(Number(session.id))
    
    if (!user) {
       return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'UNAUTHORIZED', 
          message: 'User not found' 
        }),
        { 
          status: 401, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }

  

    const resolvedParams = props?.params ? await props.params : undefined
    
    const context = {
        request,
        env,
        params: resolvedParams,
        user
    } as unknown as T

    return handler(context)
  }
}
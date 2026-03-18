import { createSession, isSecureRequest, jsonWithSession, SESSION_COOKIE_MAX_AGE_SECONDS } from '@/shared/session'
import { verifyPassword } from '@/shared/password'
import { Env } from '@/shared/types'
import { MeRepository } from '@/shared/repositories/me.repository'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { getNextResendAvailableAt } from '@/shared/services/email-verification.service'
import { logUserJournalEvent } from '@/shared/services/user-journal.service'
import { UserSessionsRepository, getClientIp } from '@/shared/repositories/user-sessions.repository'

interface LoginRequest {
  email: string
  password: string
}

export async function POST(request: Request) {
  const env = process.env as Env

  if (!env.AUTH_SECRET) {
    return new Response(JSON.stringify({ error: 'Authentication not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: LoginRequest = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize repository
    const meRepository = MeRepository.getInstance()
    const usersRepository = UsersRepository.getInstance()

    const persistedUser = await usersRepository.findByEmail(email)
    if (!persistedUser) {
      return new Response(JSON.stringify({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Query user from database with roles
    const userWithRoles = await meRepository.findByEmailWithRoles(email)

    if (!userWithRoles) {
      return new Response(JSON.stringify({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { roles, human } = userWithRoles

    // Verify password
    const isValidPassword = await verifyPassword(persistedUser.salt, password, persistedUser.passwordHash)
    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!persistedUser.emailVerifiedAt) {
      const resendAvailableAt = getNextResendAvailableAt(persistedUser)
      return new Response(
        JSON.stringify({
          error: 'Email is not verified',
          code: 'EMAIL_NOT_VERIFIED',
          resendAvailableAt,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Determine if user is admin (has any system role)
    const isAdmin = roles.some((role) => role.isSystem === true)

    await usersRepository.update(persistedUser.uuid, {
      lastLoginAt: new Date(),
    })

    const sessionUuid = crypto.randomUUID()
    try {
      const userSessionsRepository = UserSessionsRepository.getInstance()
      const expiresAt = new Date(Date.now() + SESSION_COOKIE_MAX_AGE_SECONDS * 1000).toISOString()
      await userSessionsRepository.createSession({
        sessionUuid,
        userId: typeof persistedUser.id === "number" ? persistedUser.id : Number(persistedUser.id),
        userAgent: request.headers.get("user-agent"),
        ip: getClientIp(request),
        expiresAt,
      })
    } catch (e) {
      console.error("Failed to persist user session:", e)
      // Log full error details for debugging
      if (e instanceof Error) {
        console.error("Error message:", e.message)
        console.error("Error stack:", e.stack)
      }
      // Don't fail login if session creation fails, but log it
    }

    // Create session cookie (include sessionUuid)
    const sessionCookie = await createSession(
      {
        id: String(persistedUser.id),
        email: persistedUser.email,
        name: human?.fullName || persistedUser.email,
        role: isAdmin ? 'admin' : 'user',
        sessionUuid,
      },
      env.AUTH_SECRET,
      {
        secure: isSecureRequest(request),
        sameSite: 'Lax',
        sessionUuid,
      }
    )

    try {
      await logUserJournalEvent(env, 'USER_JOURNAL_LOGIN', persistedUser)
    } catch (journalError) {
      console.error('Failed to log user login action', journalError)
    }

    return jsonWithSession(
      {
        success: true,
        user: {
          id: persistedUser.id,
          uuid: persistedUser.uuid,
          email: persistedUser.email,
          name: human?.fullName || persistedUser.email,
          role: isAdmin ? 'admin' : 'user',
          roles: roles.map((role) => ({
            uuid: role.uuid,
            title: role.title,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
            dataIn: role.dataIn,
          })),
        },
      },
      sessionCookie
    )
  } catch (error) {
    console.error('Login error:', error)
    
    // Provide more detailed error information
    let errorMessage = 'Login failed'
    let errorDetails: string | undefined
    
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage
      errorDetails = error.stack
      console.error('Error stack:', error.stack)
    } else if (typeof error === 'string') {
      errorMessage = error
    } else {
      errorDetails = String(error)
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        code: 'LOGIN_ERROR'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}


import { NextRequest, NextResponse } from 'next/server'

import { getSession } from '@/shared/session'
import { MeRepository } from '@/shared/repositories/me.repository'
import { UserSessionsRepository, getClientIp } from '@/shared/repositories/user-sessions.repository'
import { clearSession, isSecureRequest } from '@/shared/session'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import { LANGUAGES, PROJECT_SETTINGS } from '@/settings'

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
} as const

function parseDataIn(input: unknown): Record<string, any> {
  if (!input) return {}
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as Record<string, any>
    } catch {
      return {}
    }
  }
  if (typeof input === 'object') {
    return input as Record<string, any>
  }
  return {}
}

function resolveUserLanguage(humanDataIn: Record<string, any>, userDataIn: Record<string, any>): string {
  const supported = new Set(LANGUAGES.map((lang) => lang.code))
  const humanLanguage = typeof humanDataIn.language === 'string' ? humanDataIn.language : null
  if (humanLanguage && supported.has(humanLanguage)) {
    return humanLanguage
  }
  const userLanguage = typeof userDataIn.language === 'string' ? userDataIn.language : null
  if (userLanguage && supported.has(userLanguage)) {
    return userLanguage
  }
  return PROJECT_SETTINGS.defaultLanguage
}

export async function GET(request: NextRequest) {
  const authSecret = process.env.AUTH_SECRET

  if (!authSecret) {
    return NextResponse.json(
      { error: 'Authentication not configured' },
      { status: 500, headers: JSON_HEADERS }
    )
  }

  const sessionUser = await getSession(request, authSecret)

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: JSON_HEADERS }
    )
  }

  if (sessionUser.sessionUuid) {
    try {
      const repo = UserSessionsRepository.getInstance()
      const active = await repo.ensureActiveSession({
        sessionUuid: sessionUser.sessionUuid,
        userId: Number(sessionUser.id),
        userAgent: request.headers.get('user-agent'),
        ip: getClientIp(request),
      })
      if (!active) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          {
            status: 401,
            headers: {
              ...JSON_HEADERS,
              'Set-Cookie': clearSession({
                secure: isSecureRequest(request),
                sameSite: 'Lax',
              }),
            },
          }
        )
      }
    } catch (e) {
      console.error('Failed to validate sessionUuid:', e)
    }
  }

  try {
    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUser.id))

    if (!userWithRoles) {
      return NextResponse.json({ error: 'User not found' }, { status: 401, headers: JSON_HEADERS })
    }

    const { user: dbUser, roles, human } = userWithRoles

    if (dbUser.deletedAt) {
      return NextResponse.json(
        { error: 'User account deleted' },
        { status: 403, headers: JSON_HEADERS }
      )
    }

    if (!dbUser.isActive) {
      return NextResponse.json(
        { error: 'User account inactive' },
        { status: 403, headers: JSON_HEADERS }
      )
    }

    // Extract phone + avatar from human.dataIn if available
    let phone: string | undefined
    let avatarMediaUuid: string | undefined
    const humanDataIn = parseDataIn(human?.dataIn)
    const userDataIn = parseDataIn(dbUser.dataIn)
    phone = humanDataIn?.phone || undefined
    avatarMediaUuid = humanDataIn?.avatarMedia?.uuid || undefined
    const language = resolveUserLanguage(humanDataIn, userDataIn)

    const user = {
      id: String(dbUser.id),
      uuid: dbUser.uuid,
      email: dbUser.email,
      name: human?.fullName || dbUser.email,
      language,
      phone,
      avatarMediaUuid: avatarMediaUuid || null,
      avatarUrl: avatarMediaUuid ? `/api/altrp/v1/media/${avatarMediaUuid}` : null,
      humanAid: dbUser.humanAid || null,
      roles: roles.map((role) => ({
        uuid: role.uuid,
        title: role.title,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        dataIn: role.dataIn,
      })),
    }

    return NextResponse.json({ user }, { status: 200, headers: JSON_HEADERS })
  } catch (error) {
    console.error('Get user data error:', error)
    return NextResponse.json(
      { error: 'Failed to verify user', details: String(error) },
      { status: 500, headers: JSON_HEADERS }
    )
  }
}

export async function PUT(request: NextRequest) {
  const authSecret = process.env.AUTH_SECRET

  if (!authSecret) {
    return NextResponse.json(
      { error: 'Authentication not configured' },
      { status: 500, headers: JSON_HEADERS }
    )
  }

  const sessionUser = await getSession(request, authSecret)

  if (!sessionUser) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: JSON_HEADERS }
    )
  }

  if (sessionUser.sessionUuid) {
    try {
      const repo = UserSessionsRepository.getInstance()
      const active = await repo.ensureActiveSession({
        sessionUuid: sessionUser.sessionUuid,
        userId: Number(sessionUser.id),
        userAgent: request.headers.get('user-agent'),
        ip: getClientIp(request),
      })
      if (!active) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          {
            status: 401,
            headers: {
              ...JSON_HEADERS,
              'Set-Cookie': clearSession({
                secure: isSecureRequest(request),
                sameSite: 'Lax',
              }),
            },
          }
        )
      }
    } catch (e) {
      console.error('Failed to validate sessionUuid:', e)
    }
  }

  try {
    const body = await request.json() as { language?: string }
    const language = typeof body.language === 'string' ? body.language.trim() : ''
    const supported = new Set(LANGUAGES.map((lang) => lang.code))

    if (!supported.has(language)) {
      return NextResponse.json(
        { error: 'Unsupported language' },
        { status: 400, headers: JSON_HEADERS }
      )
    }

    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUser.id), { includeHuman: true })

    if (!userWithRoles) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: JSON_HEADERS }
      )
    }

    const { user: dbUser, human } = userWithRoles

    if (human?.uuid) {
      const humanRepository = HumanRepository.getInstance()
      const currentDataIn = parseDataIn(human.dataIn)
      const nextDataIn = {
        ...currentDataIn,
        language,
      }

      await humanRepository.update(human.uuid, {
        dataIn: nextDataIn as any,
      })
    } else {
      const db = createDb()
      const currentUserDataIn = parseDataIn(dbUser.dataIn)
      const nextUserDataIn = {
        ...currentUserDataIn,
        language,
      }

      await db
        .update(schema.users)
        .set({ dataIn: nextUserDataIn as any })
        .where(eq(schema.users.id, dbUser.id))
    }

    return NextResponse.json(
      { success: true, language },
      { status: 200, headers: JSON_HEADERS }
    )
  } catch (error) {
    console.error('Update user language error:', error)
    return NextResponse.json(
      { error: 'Failed to update language', details: String(error) },
      { status: 500, headers: JSON_HEADERS }
    )
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}


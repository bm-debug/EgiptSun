/// <reference types="@cloudflare/workers-types" />

import { clearSession, getSession, isSecureRequest } from '@/shared/session'
import type { Env } from '@/shared/types'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { logUserJournalEvent } from '@/shared/services/user-journal.service'
import { buildRequestEnv } from '@/shared/env'
import { UserSessionsRepository } from '@/shared/repositories/user-sessions.repository'

/**
 * POST /api/auth/logout
 * Clears session cookie
 */
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context

  if (env.AUTH_SECRET) {
    try {
      const session = await getSession(request, env.AUTH_SECRET)
      if (session?.email) {
        const usersRepository = UsersRepository.getInstance()
        const user = await usersRepository.findByEmail(session.email)
        if (user) {
          await logUserJournalEvent(env, 'USER_JOURNAL_LOGOUT', user)
        }
      }
      if (session?.sessionUuid && session?.id) {
        try {
          const repo = UserSessionsRepository.getInstance()
          await repo.revokeSession(session.sessionUuid, Number(session.id))
        } catch (e) {
          console.error('Failed to revoke user session', e)
        }
      }
    } catch (error) {
      console.error('Failed to log logout action', error)
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSession({
        secure: isSecureRequest(request),
        sameSite: 'Lax',
      }),
    },
  })
}

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })

export async function POST(request: Request) {
  const env = buildRequestEnv()
  return onRequestPost({ request, env })
}

export async function OPTIONS() {
  return onRequestOptions()
}


/// <reference types="@cloudflare/workers-types" />

import type { Env } from '@/shared/types'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { sendPasswordResetEmail } from '@/shared/services/password-reset.service'
import { logUserJournalEvent } from '@/shared/services/user-journal.service'
import { buildRequestEnv } from '@/shared/env'
import { getUserLanguage, parseAcceptLanguage } from '@/shared/utils/user-language'

type RequestPasswordResetBody = {
  email?: string
}

const jsonHeaders = {
  'Content-Type': 'application/json',
} as const

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = (await request.json()) as RequestPasswordResetBody
    const email = body.email?.trim().toLowerCase()

    // Always return success to avoid leaking whether a user exists.
    if (!email) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders })
    }

    const usersRepository = UsersRepository.getInstance()
    const user = await usersRepository.findByEmail(email)

    if (user) {
      try {
        // Get user language preference from database, fallback to Accept-Language header
        let locale: string | undefined
        try {
          locale = await getUserLanguage(user)
        } catch (error) {
          console.error('Failed to get user language, using Accept-Language header:', error)
        }
        if (!locale) {
          locale = parseAcceptLanguage(request.headers.get('accept-language'))
        }
        
        const result = await sendPasswordResetEmail(env, user, { request, locale })
        try {
          await logUserJournalEvent(env, 'USER_JOURNAL_PASSWORD_RESET_REQUEST', user)
        } catch (journalError) {
          console.error('Failed to log password reset request', journalError)
        }
        return new Response(JSON.stringify({ success: true, resendAvailableAt: result.resendAvailableAt }), {
          status: 200,
          headers: jsonHeaders,
        })
      } catch (e) {
        // Rate limit / cooldown errors should still not leak user existence; return generic success.
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders })
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders })
  } catch (error) {
    console.error('Password reset request error:', error)
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders })
  }
}

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })

export async function POST(request: Request) {
  const env = buildRequestEnv()
  return onRequestPost({ request, env })
}

export async function OPTIONS() {
  return onRequestOptions()
}



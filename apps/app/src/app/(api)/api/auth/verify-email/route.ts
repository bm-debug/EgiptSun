/// <reference types="@cloudflare/workers-types" />

import type { Env } from '@/shared/types'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { EmailVerificationError, verifyEmailToken } from '@/shared/services/email-verification.service'
import { logUserJournalEvent } from '@/shared/services/user-journal.service'
import { buildRequestEnv } from '@/shared/env'

type VerifyEmailRequest = {
  email?: string
  token?: string
}

const jsonHeaders = {
  'Content-Type': 'application/json',
} as const

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = (await request.json()) as VerifyEmailRequest
    const email = body.email?.trim().toLowerCase()
    const token = body.token?.trim()

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: 'Email and token are required' }),
        { status: 400, headers: jsonHeaders },
      )
    }

    const usersRepository = UsersRepository.getInstance()
    const user = await usersRepository.findByEmail(email)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Verification failed' }),
        { status: 400, headers: jsonHeaders },
      )
    }

    if (user.emailVerifiedAt) {
      return new Response(
        JSON.stringify({ success: true, alreadyVerified: true }),
        { status: 200, headers: jsonHeaders },
      )
    }

    const updatedUser = await verifyEmailToken(env, user, token)

    try {
      await logUserJournalEvent(env, 'USER_JOURNAL_EMAIL_VERIFICATION', updatedUser)
    } catch (journalError) {
      console.error('Failed to log email verification', journalError)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: jsonHeaders },
    )
  } catch (error) {
    console.error('Email verification error:', error)
    if (error instanceof EmailVerificationError) {
      return new Response(
        JSON.stringify({
          success: false,
          code: error.code,
          error: error.message,
        }),
        { status: 400, headers: jsonHeaders },
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      }),
      { status: 500, headers: jsonHeaders },
    )
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



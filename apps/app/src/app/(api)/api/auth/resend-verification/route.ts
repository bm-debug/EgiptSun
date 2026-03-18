/// <reference types="@cloudflare/workers-types" />

import type { Env } from '@/shared/types'
import { UsersRepository } from '@/shared/repositories/users.repository'
import {
  EmailVerificationError,
  sendVerificationEmail,
  getNextResendAvailableAt,
} from '@/shared/services/email-verification.service'
import { buildRequestEnv } from '@/shared/env'

type ResendRequest = {
  email?: string
}

const jsonHeaders = {
  'Content-Type': 'application/json',
} as const

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = (await request.json()) as ResendRequest
    const email = body.email?.trim().toLowerCase()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: jsonHeaders,
      })
    }

    const usersRepository = UsersRepository.getInstance()
    const user = await usersRepository.findByEmail(email)

    if (!user) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: jsonHeaders,
      })
    }

    if (user.emailVerifiedAt) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyVerified: true,
        }),
        { status: 200, headers: jsonHeaders },
      )
    }

    await sendVerificationEmail(env, user, { request })
    const refreshedUser = await usersRepository.findByEmail(email)

    return new Response(
      JSON.stringify({
        success: true,
        resendAvailableAt: refreshedUser ? getNextResendAvailableAt(refreshedUser) : getNextResendAvailableAt(user),
      }),
      { status: 200, headers: jsonHeaders },
    )
  } catch (error) {
    if (error instanceof EmailVerificationError && error.code === 'RESEND_TOO_SOON') {
      return new Response(
        JSON.stringify({
          success: false,
          code: error.code,
          error: error.message,
          resendAvailableAt: error.nextAttemptAt,
        }),
        { status: 429, headers: jsonHeaders },
      )
    }

    console.error('Resend verification error:', error)
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



/// <reference types="@cloudflare/workers-types" />

import type { Env } from '@/shared/types'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { verifyPasswordResetToken } from '@/shared/services/password-reset.service'
import { logUserJournalEvent } from '@/shared/services/user-journal.service'
import { buildRequestEnv } from '@/shared/env'
import { preparePassword, validatePassword } from '@/shared/password'

type ConfirmPasswordResetBody = {
  email?: string
  token?: string
  newPassword?: string
}

const jsonHeaders = {
  'Content-Type': 'application/json',
} as const

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = (await request.json()) as ConfirmPasswordResetBody
    const email = body.email?.trim().toLowerCase()
    const token = body.token?.trim()
    const newPassword = body.newPassword ?? ''

    if (!email || !token) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid reset request' }), {
        status: 400,
        headers: jsonHeaders,
      })
    }

    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      return new Response(JSON.stringify({ success: false, error: validation.error || 'Invalid password' }), {
        status: 400,
        headers: jsonHeaders,
      })
    }

    const usersRepository = UsersRepository.getInstance()
    const user = await usersRepository.findByEmail(email)
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Reset failed' }), { status: 400, headers: jsonHeaders })
    }

    await verifyPasswordResetToken(user, token)

    const { hashedPassword, salt } = await preparePassword(newPassword)

    const currentDataIn = typeof user.dataIn === 'string' ? (() => {
      try {
        return JSON.parse(user.dataIn)
      } catch {
        return {}
      }
    })() : (user.dataIn || {})

    const nextDataIn = { ...currentDataIn }
    delete (nextDataIn as any).passwordReset

    const updatedUser = await usersRepository.update(user.uuid, {
      passwordHash: hashedPassword,
      salt,
      dataIn: nextDataIn,
    })

    try {
      await logUserJournalEvent(env, 'USER_JOURNAL_PASSWORD_RESET_CONFIRM', updatedUser)
    } catch (journalError) {
      console.error('Failed to log password reset confirm', journalError)
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders })
  } catch (error) {
    console.error('Password reset confirm error:', error)
    return new Response(JSON.stringify({ success: false, error: 'Reset failed' }), { status: 400, headers: jsonHeaders })
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



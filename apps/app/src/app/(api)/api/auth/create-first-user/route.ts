/// <reference types="@cloudflare/workers-types" />

import { createSession, isSecureRequest, jsonWithSession } from '@/shared/session'
import { generateAid } from '@/shared/generate-aid'
import { preparePassword, validatePassword, validatePasswordMatch } from '@/shared/password'
import { Env } from '@/shared/types'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema/schema'
import { sql } from 'drizzle-orm'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { RolesRepository } from '@/shared/repositories/roles.repository'
import { UserRolesRepository } from '@/shared/repositories/user-roles.repository'
import { buildRequestEnv } from '@/shared/env'
import { isPostgres } from '@/shared/utils/db'
interface CreateUserRequest {
  email: string
  name: string
  password: string
  confirmPassword: string
}

/**
 * POST /api/auth/create-first-user
 * Creates the first user in the system
 */
async function handlePost(request: Request, env: Env) {
  if (!env.AUTH_SECRET) {
    return new Response(JSON.stringify({ error: 'Authentication not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: CreateUserRequest = await request.json()
    const { email, name, password, confirmPassword } = body

    // Validate input
    if (!email || !name || !password || !confirmPassword) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate password requirements
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ error: passwordValidation.error }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check password match
    const matchValidation = validatePasswordMatch(password, confirmPassword)
    if (!matchValidation.valid) {
      return new Response(
        JSON.stringify({ error: matchValidation.error }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if this is the first user
    const db = createDb()
    const [{ count = 0 } = {}] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(schema.users as any)
      .limit(1)

    if (Number(count) > 0) {
      return new Response(
        JSON.stringify({ error: 'Users already exist. Please use the login page.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare password (hash and generate salt)
    const { hashedPassword, salt } = await preparePassword(password)

    const humanRepository = HumanRepository.getInstance()
    const usersRepository = UsersRepository.getInstance()
    const rolesRepository = RolesRepository.getInstance()
    const userRolesRepository = UserRolesRepository.getInstance()

    const human = await humanRepository.generateClientByEmail(email, {
      fullName: name,
      statusName: 'VERIFIED',
    })

    let adminRole =
      (await rolesRepository
        .findAll()
        .then((roles) => roles.find((role) => role.isSystem))) || null

    if (!adminRole) {
      adminRole = await rolesRepository.create({
        name: 'Administrator',
        title: 'Суперадминистратор',
        isSystem: true,
        order: 0,
      })
    }

    const createdUser = await usersRepository.create({
      humanAid: human.haid,
      email,
      passwordHash: hashedPassword,
      salt,
      isActive: true,
      emailVerifiedAt: new Date(),
    })

    await userRolesRepository.assignRoleToUser(createdUser.uuid, adminRole.uuid, 0)

    // Create session for the new user
    const sessionCookie = await createSession(
      {
        id: String(createdUser.id),
        email,
        name,
        role: 'admin',
      },
      env.AUTH_SECRET,
      {
        secure: isSecureRequest(request),
        sameSite: 'Lax',
      }
    )

    return jsonWithSession(
      {
        success: true,
        user: {
        id: createdUser.id,
        uuid: createdUser.uuid,
        email,
        name,
        role: 'admin',
        },
      },
      sessionCookie,
      201
    )
  } catch (error) {
    console.error('Create first user error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create user', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function POST(request: Request) {
  const env = buildRequestEnv()
  return handlePost(request, env)
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



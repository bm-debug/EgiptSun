import { NextRequest, NextResponse } from 'next/server'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { MeRepository } from '@/shared/repositories/me.repository'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { UserRolesRepository } from '@/shared/repositories/user-roles.repository'
import { parseQueryParams } from '@/shared/utils/http'
import type { altrpUser } from '@/shared/types/altrp'
import { preparePassword, validatePassword, validatePasswordMatch } from '@/shared/password'
import { sendVerificationEmail } from '@/shared/services/email-verification.service'
import { logUserJournalEvent } from '@/shared/services/user-journal.service'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'

const ADMIN_ROLE_NAMES = ['Administrator', 'admin']

interface CreateUserRequest {
  email: string
  password: string
  confirmPassword: string
  fullName?: string
  roleUuids?: string[]
  emailVerified?: boolean
}

interface UserWithRoles extends altrpUser {
  roles?: Array<{
    uuid: string
    title: string | null
    name: string | null
    description: string | null
    isSystem: boolean | null
  }>
}

const handleGet = async (context: AuthenticatedRequestContext) => {
  const { request } = context
  try {
    const url = new URL(request.url)
    const { filters, orders, pagination } = parseQueryParams(url)

    // Check if roles filter is present
    const roleUuids = url.searchParams.getAll('roles')
    const kycStatus = url.searchParams.get('kycStatus')
    
    let result
    if (roleUuids.length > 0 || kycStatus) {
      // Filter users by roles using a custom query
      const db = createDb()
      const page = pagination.page || 1
      const limit = pagination.limit || 20
      const offset = (page - 1) * limit

      // Build query to get users with specific roles and/or KYC status
      const query = db
        .selectDistinct({
          id: schema.users.id,
          uuid: schema.users.uuid,
          email: schema.users.email,
          humanAid: schema.users.humanAid,
          isActive: schema.users.isActive,
          emailVerifiedAt: schema.users.emailVerifiedAt,
          createdAt: schema.users.createdAt,
          updatedAt: schema.users.updatedAt,
          deletedAt: schema.users.deletedAt,
          // Add other fields as necessary from altrpUser type
        })
        .from(schema.users)

      // Add join for roles filter if needed
      if (roleUuids.length > 0) {
        query.innerJoin(schema.userRoles, eq(schema.users.uuid, schema.userRoles.userUuid))
      }

      // Add join for humans if KYC filter is needed
      if (kycStatus) {
        query.innerJoin(schema.humans, eq(schema.users.humanAid, schema.humans.haid))
      }

      // Build where conditions
      const whereConditions = [isNull(schema.users.deletedAt)]
      
      if (roleUuids.length > 0) {
        whereConditions.push(inArray(schema.userRoles.roleUuid, roleUuids))
      }

      if (kycStatus) {
        if (kycStatus === 'not_started') {
          // For not_started, check if kycStatus is null, undefined, or 'not_started'
          whereConditions.push(
            sql`(
              ${schema.humans.dataIn}::jsonb->>'kycStatus' IS NULL OR
              ${schema.humans.dataIn}::jsonb->>'kycStatus' = 'not_started' OR
              ${schema.humans.dataIn}::jsonb->>'kycStatus' = ''
            )`
          )
        } else {
          whereConditions.push(
            sql`${schema.humans.dataIn}::jsonb->>'kycStatus' = ${kycStatus}`
          )
        }
      }

      const usersResult = await query
        .where(and(...whereConditions))
        .orderBy(desc(schema.users.createdAt))
        .limit(limit)
        .offset(offset)
        .execute()

      // Get total count
      const countQuery = db
        .select({ total: sql<number>`count(distinct ${schema.users.id})` })
        .from(schema.users)

      if (roleUuids.length > 0) {
        countQuery.innerJoin(schema.userRoles, eq(schema.users.uuid, schema.userRoles.userUuid))
      }

      if (kycStatus) {
        countQuery.innerJoin(schema.humans, eq(schema.users.humanAid, schema.humans.haid))
      }

      const [countResult] = await countQuery
        .where(and(...whereConditions))
        .execute()

      const total = countResult?.total || 0

      result = {
        docs: usersResult as altrpUser[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } else {
      // Use standard filtering
      const usersRepository = UsersRepository.getInstance()
      result = await usersRepository.getFiltered(filters, orders, pagination)
    }

    // Load roles and human for each user
    const meRepository = MeRepository.getInstance()
    const usersWithRoles = await Promise.all(
      result.docs.map(async (user) => {
        try {
          const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id), {
            includeHuman: true,
          })
          return {
            ...user,
            roles: userWithRoles?.roles?.map((role) => ({
              uuid: role.uuid,
              title: role.title ?? null,
              name: role.name ?? null,
              description: role.description ?? null,
              isSystem: role.isSystem ?? null,
            })) || [],
            human: userWithRoles?.human
              ? (() => {
                  // Parse dataIn to extract kycStatus
                  let kycStatus: string | undefined = undefined
                  try {
                    const dataIn = typeof userWithRoles.human.dataIn === 'string'
                      ? JSON.parse(userWithRoles.human.dataIn)
                      : userWithRoles.human.dataIn
                    kycStatus = dataIn?.kycStatus
                  } catch (e) {
                    // Ignore parsing errors
                  }
                  
                  return {
                    fullName: userWithRoles.human.fullName,
                    dataIn: userWithRoles.human.dataIn,
                    birthday: userWithRoles.human.birthday,
                    email: userWithRoles.human.email,
                    kycStatus: kycStatus || 'not_started',
                  }
                })()
              : undefined,
          } as UserWithRoles
        } catch (err) {
          console.error(`Failed to load roles for user ${user.uuid}:`, err)
          return {
            ...user,
            roles: [],
          } as UserWithRoles
        }
      })
    )

    return NextResponse.json({
      docs: usersWithRoles,
      pagination: result.pagination,
    })
  } catch (error) {
    console.error('Failed to fetch users', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

const handlePost = async (context: AuthenticatedRequestContext) => {
  const { request, user: currentUserWithRoles } = context
  try {
    // Check if current user is admin (has system role)
    const isAdmin = currentUserWithRoles.roles.some((role) => role.isSystem === true)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if current user is super administrator
    const isSuperAdmin = currentUserWithRoles.roles.some(
      (role) => role.name === 'Administrator'
    )

    const body = await request.json() as CreateUserRequest
    const { email, password, confirmPassword, fullName, roleUuids, emailVerified } = body

    // Validate input
    if (!email || !password || !confirmPassword) {
      return NextResponse.json({ error: 'Email, password and confirmPassword are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 })
    }

    // Validate password match
    const matchValidation = validatePasswordMatch(password, confirmPassword)
    if (!matchValidation.valid) {
      return NextResponse.json({ error: matchValidation.error }, { status: 400 })
    }

    const db = createDb()

    // Check if user with this email already exists
    const existingUser = await db.select({ uuid: schema.users.uuid })
      .from(schema.users)
      .where(and(
        eq(schema.users.email, email),
        isNull(schema.users.deletedAt)
      ))
      .limit(1)
      .execute()

    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 })
    }

    // Validate roles if provided
    if (roleUuids && Array.isArray(roleUuids) && roleUuids.length > 0) {
      // Get all role UUIDs to validate
      const roles = await db.select({ uuid: schema.roles.uuid, name: schema.roles.name })
        .from(schema.roles)
        .where(and(
          inArray(schema.roles.uuid, roleUuids),
          isNull(schema.roles.deletedAt)
        ))
        .execute()

      // Check if all provided roles exist
      if (roles.length !== roleUuids.length) {
        return NextResponse.json({ error: 'One or more roles not found' }, { status: 400 })
      }

      // If not super admin, check that no admin roles are being assigned
      if (!isSuperAdmin) {
        const adminRoles = roles.filter((role: { name: string | null }) =>
          ADMIN_ROLE_NAMES.includes(role.name || '')
        )
        if (adminRoles.length > 0) {
          return NextResponse.json({ error: 'You cannot assign administrator roles' }, { status: 403 })
        }
      }
    }

    // Prepare password
    const { hashedPassword, salt } = await preparePassword(password)

    // Create Human first (using repository)
    const humanRepository = HumanRepository.getInstance()
    const human = await humanRepository.generateClientByEmail(email, {
      fullName: fullName || email,
      type: 'CLIENT',
      statusName: 'PENDING',
    })

    // Create user using repository
    const usersRepository = UsersRepository.getInstance()
    const userData: any = {
      humanAid: human.haid,
      email,
      passwordHash: hashedPassword,
      salt,
      isActive: true,
    }
    
    // Set emailVerifiedAt if emailVerified is true
    if (emailVerified === true) {
      userData.emailVerifiedAt = new Date()
    }
    
    const createdUser = await usersRepository.create(userData)

    // Assign roles if provided
    if (roleUuids && Array.isArray(roleUuids) && roleUuids.length > 0) {
      const userRolesRepository = UserRolesRepository.getInstance()
      await userRolesRepository.assignRolesToUser(createdUser.uuid, roleUuids)
    }

    try {
        // @ts-ignore
      await sendVerificationEmail(process.env as any, createdUser, { request: request as unknown as Request, force: true })
    } catch (verificationError) {
      console.error('Failed to send verification email to new user', verificationError)
    }

    try {
       // @ts-ignore
      await logUserJournalEvent(process.env as any, 'USER_JOURNAL_REGISTRATION', createdUser)
    } catch (journalError) {
      console.error('Failed to log admin user registration', journalError)
    }

    return NextResponse.json({
      success: true,
      user: createdUser,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create user', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

export const GET = withAdminGuard(handleGet)
export const POST = withAdminGuard(handlePost)

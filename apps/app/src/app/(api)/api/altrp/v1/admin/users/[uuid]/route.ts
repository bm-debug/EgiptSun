import { NextRequest, NextResponse } from 'next/server'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { MeRepository } from '@/shared/repositories/me.repository'
import { UserRolesRepository } from '@/shared/repositories/user-roles.repository'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { preparePassword, validatePassword } from '@/shared/password'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema'
import { and, eq, isNull, inArray } from 'drizzle-orm'
import type { ClientDataIn, KycStatus } from '@/shared/types/altrp'
import { logUserJournalEvent } from '@/shared/services/user-journal.service'
import { buildRequestEnv } from '@/shared/env'
import { sendToRoom } from '@/packages/lib/socket'

const ADMIN_ROLE_NAMES = ['Administrator', 'admin']

interface UpdateUserRequest {
  email?: string
  password?: string
  fullName?: string
  firstName?: string
  lastName?: string
  middleName?: string
  isActive?: boolean
  roleUuids?: string[]
  emailVerified?: boolean
  kycStatus?: KycStatus
  monthlyIncome?: string
  monthlyExpenses?: string
  workPlace?: string
  workExperience?: string
  // OCR/Passport fields
  birthday?: string
  sex?: string
  placeOfBirth?: string
  registrationAddress?: string
  passportSeries?: string
  passportNumber?: string
  passportIssueDate?: string
  passportIssuedBy?: string
  passportDivisionCode?: string
  citizenship?: string
}

const handleGet = async (
  context: AuthenticatedRequestContext,
  identifier: string
) => {
  const { request } = context
  try {
    const meRepository = MeRepository.getInstance()
    const usersRepository = UsersRepository.getInstance()
    const humanRepository = HumanRepository.getInstance()

    let user = null

    // Check if identifier is a haid (starts with 'H-' or 'h-')
    if (identifier.startsWith('H-') || identifier.startsWith('h-')) {
      // Find user by humanAid (haid)
      const [userRecord] = await createDb()
        .select()
        .from(schema.users)
        .where(
          and(
            eq(schema.users.humanAid, identifier),
            isNull(schema.users.deletedAt)
          )
        )
        .limit(1)
        .execute()

      if (!userRecord) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      user = userRecord as any
    } else {
      // Find user by UUID
      user = await usersRepository.findByUuid(identifier)
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user with roles
    const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id))

    // Get human data
    let human = null
    if (user.humanAid) {
      human = await humanRepository.findByHaid(user.humanAid)
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        roles: userWithRoles?.roles || [],
        human: human || null,
      },
    })
  } catch (error) {
    console.error('Failed to fetch user', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

const handlePut = async (
  context: AuthenticatedRequestContext,
  uuid: string
) => {
  const { request, user: currentUserWithRoles } = context
  try {
    // Check if current user is admin
    const isAdmin = currentUserWithRoles.roles.some((role) => role.isSystem === true)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if current user is super administrator
    const isSuperAdmin = currentUserWithRoles.roles.some(
      (role) => role.name === 'Administrator'
    )

    const body = await request.json() as UpdateUserRequest
    const {
      email,
      password,
      fullName,
      firstName,
      lastName,
      middleName,
      isActive,
      roleUuids,
      emailVerified,
      kycStatus,
      monthlyIncome,
      monthlyExpenses,
      workPlace,
      workExperience,
      birthday,
      sex,
      placeOfBirth,
      registrationAddress,
      passportSeries,
      passportNumber,
      passportIssueDate,
      passportIssuedBy,
      passportDivisionCode,
      citizenship,
    } = body

    const usersRepository = UsersRepository.getInstance()
    const existingUser = await usersRepository.findByUuid(uuid)

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const db = createDb()
    const updateData: any = {}

    // Update email if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }

      // Check if email is already taken by another user
      const emailUser = await db
        .select({ uuid: schema.users.uuid })
        .from(schema.users)
        .where(and(
          eq(schema.users.email, email),
          isNull(schema.users.deletedAt)
        ))
        .limit(1)
        .execute()

      if (emailUser.length > 0 && emailUser[0].uuid !== uuid) {
        return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 })
      }

      updateData.email = email
    }

    // Update password if provided
    if (password !== undefined && password !== '') {
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.valid) {
        return NextResponse.json({ error: passwordValidation.error }, { status: 400 })
      }

      const { hashedPassword, salt } = await preparePassword(password)
      updateData.passwordHash = hashedPassword
      updateData.salt = salt
    }

    // Update isActive if provided
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    // Update emailVerifiedAt if emailVerified is provided
    if (emailVerified !== undefined) {
      updateData.emailVerifiedAt = emailVerified ? new Date() : null
    }

    // Update user
    if (Object.keys(updateData).length > 0) {
      await usersRepository.update(uuid, updateData)
    }

    // Track which passport/OCR fields were updated for journaling
    const updatedPassportFields: string[] = []
    
    // Validate Cyrillic characters if firstName, lastName, or middleName are provided
    const RUSSIAN_TEXT_REGEX = /^[А-Яа-яЁё\s-]+$/
    if (firstName !== undefined && firstName && !RUSSIAN_TEXT_REGEX.test(firstName)) {
      return NextResponse.json(
        { error: 'Имя должно содержать только кириллические символы' },
        { status: 400 }
      )
    }
    if (lastName !== undefined && lastName && !RUSSIAN_TEXT_REGEX.test(lastName)) {
      return NextResponse.json(
        { error: 'Фамилия должна содержать только кириллические символы' },
        { status: 400 }
      )
    }
    if (middleName !== undefined && middleName && !RUSSIAN_TEXT_REGEX.test(middleName)) {
      return NextResponse.json(
        { error: 'Отчество должно содержать только кириллические символы' },
        { status: 400 }
      )
    }

    // Update human-related data (fullName, firstName, lastName, middleName, kycStatus, financial info, passport fields)
    if (
      (fullName !== undefined ||
        firstName !== undefined ||
        lastName !== undefined ||
        middleName !== undefined ||
        birthday !== undefined ||
        sex !== undefined ||
        kycStatus !== undefined ||
        monthlyIncome !== undefined ||
        monthlyExpenses !== undefined ||
        workPlace !== undefined ||
        workExperience !== undefined ||
        placeOfBirth !== undefined ||
        registrationAddress !== undefined ||
        passportSeries !== undefined ||
        passportNumber !== undefined ||
        passportIssueDate !== undefined ||
        passportIssuedBy !== undefined ||
        passportDivisionCode !== undefined ||
        citizenship !== undefined) &&
      existingUser.humanAid
    ) {
      const humanRepository = HumanRepository.getInstance()
      const human = await humanRepository.findByHaid(existingUser.humanAid)
      if (human) {
        const humanUpdate: any = {}
        const now = new Date().toISOString()

        // Build fullName from separate fields or use provided fullName
        let computedFullName = fullName
        if (!computedFullName && (firstName || lastName)) {
          const nameParts = [
            lastName?.trim() || '',
            firstName?.trim() || '',
            middleName?.trim() || '',
          ].filter(Boolean)
          computedFullName = nameParts.join(' ') || human.fullName
        }

        if (computedFullName !== undefined) {
          humanUpdate.fullName = computedFullName.trim() || null
          updatedPassportFields.push('fullName')
        }

        if (birthday !== undefined) {
          humanUpdate.birthday = birthday.trim() || null
          updatedPassportFields.push('birthday')
        }

        if (sex !== undefined) {
          humanUpdate.sex = sex.trim() || null
          updatedPassportFields.push('sex')
        }

        // merge/update dataIn for kycStatus, financial fields, and passport fields
        let dataIn: ClientDataIn & Record<string, any> = {}
        if (human.dataIn) {
          try {
            dataIn =
              typeof human.dataIn === 'string'
                ? (JSON.parse(human.dataIn) as ClientDataIn & Record<string, any>)
                : (human.dataIn as ClientDataIn & Record<string, any>)
          } catch (err) {
            console.error('Failed to parse human.dataIn while updating:', err)
            dataIn = {}
          }
        }

        // Update firstName, lastName, middleName in dataIn
        if (firstName !== undefined) {
          dataIn.firstName = firstName.trim() || undefined
        }
        if (lastName !== undefined) {
          dataIn.lastName = lastName.trim() || undefined
        }
        if (middleName !== undefined) {
          dataIn.middleName = middleName.trim() || undefined
        }

        // Initialize verifiedProfile if it doesn't exist
        if (!dataIn.verifiedProfile) {
          dataIn.verifiedProfile = { fields: {} }
        }
        if (!dataIn.verifiedProfile.fields) {
          dataIn.verifiedProfile.fields = {}
        }

        // Update financial fields
        const kycStatusChanged = kycStatus !== undefined && dataIn.kycStatus !== kycStatus
        if (kycStatus !== undefined) {
          dataIn.kycStatus = kycStatus
        }
        if (monthlyIncome !== undefined) {
          dataIn.monthlyIncome = monthlyIncome
        }
        if (monthlyExpenses !== undefined) {
          dataIn.monthlyExpenses = monthlyExpenses
        }
        if (workPlace !== undefined) {
          dataIn.workPlace = workPlace
        }
        if (workExperience !== undefined) {
          dataIn.workExperience = workExperience
        }

        // Update passport/OCR fields in dataIn and track sources
        const updateField = (key: string, value: string | undefined) => {
          if (value !== undefined) {
            const trimmedValue = value.trim() || null
            dataIn[key] = trimmedValue
            
            // Track source as manual (admin override)
            dataIn.verifiedProfile.fields[key] = {
              value: trimmedValue,
              source: 'manual',
              updatedAt: now,
              updatedByUserUuid: currentUserWithRoles.uuid,
            }
            
            updatedPassportFields.push(key)
          }
        }

        updateField('placeOfBirth', placeOfBirth)
        updateField('registrationAddress', registrationAddress)
        updateField('passportSeries', passportSeries)
        updateField('passportNumber', passportNumber)
        updateField('passportIssueDate', passportIssueDate)
        updateField('passportIssuedBy', passportIssuedBy)
        updateField('passportDivisionCode', passportDivisionCode)
        updateField('citizenship', citizenship)

        // Also track fullName, firstName, lastName, middleName, birthday, sex in verifiedProfile if they were updated
        if (computedFullName !== undefined) {
          dataIn.verifiedProfile.fields.fullName = {
            value: computedFullName.trim() || null,
            source: 'manual',
            updatedAt: now,
            updatedByUserUuid: currentUserWithRoles.uuid,
          }
        }
        if (firstName !== undefined) {
          dataIn.verifiedProfile.fields.firstName = {
            value: firstName.trim() || null,
            source: 'manual',
            updatedAt: now,
            updatedByUserUuid: currentUserWithRoles.uuid,
          }
        }
        if (lastName !== undefined) {
          dataIn.verifiedProfile.fields.lastName = {
            value: lastName.trim() || null,
            source: 'manual',
            updatedAt: now,
            updatedByUserUuid: currentUserWithRoles.uuid,
          }
        }
        if (middleName !== undefined) {
          dataIn.verifiedProfile.fields.middleName = {
            value: middleName.trim() || null,
            source: 'manual',
            updatedAt: now,
            updatedByUserUuid: currentUserWithRoles.uuid,
          }
        }
        if (birthday !== undefined) {
          dataIn.verifiedProfile.fields.birthday = {
            value: birthday.trim() || null,
            source: 'manual',
            updatedAt: now,
            updatedByUserUuid: currentUserWithRoles.uuid,
          }
        }
        if (sex !== undefined) {
          dataIn.verifiedProfile.fields.sex = {
            value: sex.trim() || null,
            source: 'manual',
            updatedAt: now,
            updatedByUserUuid: currentUserWithRoles.uuid,
          }
        }

        humanUpdate.dataIn = dataIn as any

        if (Object.keys(humanUpdate).length > 0) {
          await humanRepository.update(human.uuid, humanUpdate)
          
          // Log journal event if passport/OCR fields were updated
          if (updatedPassportFields.length > 0) {
            try {
              const env = buildRequestEnv()
              await logUserJournalEvent(
                env,
                'USER_JOURNAL_ADMIN_OCR_OVERRIDE',
                {
                  id: existingUser.id,
                  uuid: existingUser.uuid,
                  email: existingUser.email,
                  humanAid: existingUser.humanAid,
                  dataIn: existingUser.dataIn as any,
                },
                {
                  adminUser: {
                    uuid: currentUserWithRoles.uuid,
                    email: currentUserWithRoles.email,
                  },
                  updatedFields: updatedPassportFields,
                  source: 'manual',
                }
              )
            } catch (journalError) {
              console.error('Failed to log admin OCR override event', journalError)
              // Don't fail update if journal logging fails
            }
          }

          // Send socket notification if KYC status was changed
          if (kycStatusChanged) {
            try {
              await sendToRoom('admin', 'update-admin', {
                type: 'admin-updated-notices',
              })
            } catch (socketError) {
              console.error('Failed to send admin-updated-notices socket event:', socketError)
              // Don't fail update if socket notification fails
            }
          }
        }
      }
    }

    // Update roles if provided
    if (roleUuids !== undefined && Array.isArray(roleUuids)) {
      // Validate roles if provided
      if (roleUuids.length > 0) {
        const roles = await db
          .select({ uuid: schema.roles.uuid, name: schema.roles.name })
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

      const userRolesRepository = UserRolesRepository.getInstance()
      // Remove all existing roles
      await userRolesRepository.removeAllRolesFromUser(uuid)
      // Assign new roles
      if (roleUuids.length > 0) {
        await userRolesRepository.assignRolesToUser(uuid, roleUuids)
      }
    }

    // Get updated user with roles
    const updatedUser = await usersRepository.findByUuid(uuid)
    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(updatedUser.id))

    // Get human data
    let human = null
    if (updatedUser.humanAid) {
      const humanRepository = HumanRepository.getInstance()
      human = await humanRepository.findByHaid(updatedUser.humanAid)
    }

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        roles: userWithRoles?.roles || [],
        human: human || null,
      },
    })
  } catch (error) {
    console.error('Failed to update user', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  const params = await context.params
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx, params.uuid) // uuid parameter can be either UUID or haid
  })(request, { params: Promise.resolve(params) })
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  const params = await context.params
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handlePut(ctx, params.uuid)
  })(request, { params: Promise.resolve(params) })
}


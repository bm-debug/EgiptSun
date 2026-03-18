import { NextResponse } from 'next/server'
import { withRoleGuard, AuthenticatedRequestContext, withClientGuard } from '@/shared/api-guard'
import { MeRepository } from '@/shared/repositories/me.repository'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import type { UpdateProfileKycRequest, ClientDataIn, KycDocumentRef } from '@/shared/types/altrp'

const handleGet = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { user } = context

  try {
    // Get human profile from user first
    let human = user.human
    if (!human) {
      const meRepository = MeRepository.getInstance()
      const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id), { includeHuman: true })
      human = userWithRoles?.human
    }

    if (!human) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Профиль не найден',
        },
        { status: 404 }
      )
    }

    // Parse dataIn if it's a string
    let dataIn: ClientDataIn & { firstName?: string; lastName?: string; middleName?: string } = {}
    if (human.dataIn) {
      try {
        dataIn = typeof human.dataIn === 'string' ? (JSON.parse(human.dataIn) as ClientDataIn & { firstName?: string; lastName?: string; middleName?: string }) : (human.dataIn as ClientDataIn & { firstName?: string; lastName?: string; middleName?: string })
      } catch (error) {
        console.error('Ошибка при парсинге human.dataIn:', error)
        dataIn = {}
      }
    }

    // Extract phone and address from dataIn
    const phone = dataIn.phone || undefined
    const address = (dataIn as any).permanentAddress || (dataIn as any).registrationAddress || undefined

    return NextResponse.json(
      {
        profile: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          name: human.fullName || user.email,
          firstName: dataIn.firstName || undefined,
          lastName: dataIn.lastName || undefined,
          middleName: dataIn.middleName || undefined,
          phone,
          address,
          kycStatus: dataIn.kycStatus || 'not_started',
          kycDocuments: (dataIn.kycDocuments || []).map((doc) => {
            // Map backend types to frontend document IDs
            const typeMap: Record<string, string> = {
              'passport_registration': 'passport_registration',
              'selfie_with_passport': 'selfie_with_passport',
              'other': 'income_certificate',
            }
            const frontendId = typeMap[doc.type] || doc.type
            
            return {
              id: frontendId,
              name: doc.type || '',
              status: (doc as any).status || 'pending',
              uploadedAt: doc.uploadedAt,
              mediaUuid: doc.mediaUuid,
              verificationResult: doc.verificationResult,
            }
          }),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get profile error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message,
      },
      { status: 500 }
    )
  }
}

const handlePut = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { request, user } = context

  try {
    const body = (await request.json()) as UpdateProfileKycRequest | { name?: string; firstName?: string; lastName?: string; middleName?: string; phone?: string; address?: string }

    // Check if this is a profile update (name, firstName, lastName, middleName, phone, address) or KYC documents update
    if ('name' in body || 'firstName' in body || 'lastName' in body || 'middleName' in body || 'phone' in body || 'address' in body) {
      // Profile update (name, phone, address)
      let human = user.human
      if (!human) {
        const meRepository = MeRepository.getInstance()
        const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id), { includeHuman: true })
        human = userWithRoles?.human
      }

      if (!human) {
        return NextResponse.json(
          {
            success: false,
            error: 'NOT_FOUND',
            message: 'Профиль не найден',
          },
          { status: 404 }
        )
      }

      // Parse current dataIn
      let dataIn: ClientDataIn & Record<string, any> = {}
      if (human.dataIn) {
        try {
          dataIn = typeof human.dataIn === 'string' ? (JSON.parse(human.dataIn) as ClientDataIn & Record<string, any>) : (human.dataIn as ClientDataIn & Record<string, any>)
        } catch (error) {
          console.error('Ошибка при парсинге human.dataIn:', error)
          dataIn = {}
        }
      }

      // Validate Cyrillic characters if firstName, lastName, or middleName are provided
      const RUSSIAN_TEXT_REGEX = /^[А-Яа-яЁё\s-]+$/
      if (body.firstName !== undefined && body.firstName && !RUSSIAN_TEXT_REGEX.test(body.firstName)) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Имя должно содержать только кириллические символы',
          },
          { status: 400 }
        )
      }
      if (body.lastName !== undefined && body.lastName && !RUSSIAN_TEXT_REGEX.test(body.lastName)) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Фамилия должна содержать только кириллические символы',
          },
          { status: 400 }
        )
      }
      if (body.middleName !== undefined && body.middleName && !RUSSIAN_TEXT_REGEX.test(body.middleName)) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Отчество должно содержать только кириллические символы',
          },
          { status: 400 }
        )
      }

      // Build fullName from separate fields or use provided name
      let fullName = body.name
      if (!fullName && (body.firstName || body.lastName)) {
        const nameParts = [
          body.lastName?.trim() || dataIn.lastName || '',
          body.firstName?.trim() || dataIn.firstName || '',
          body.middleName?.trim() || dataIn.middleName || '',
        ].filter(Boolean)
        fullName = nameParts.join(' ') || human.fullName
      }

      // Update dataIn with new values
      const updatedDataIn: ClientDataIn & Record<string, any> = {
        ...dataIn,
        ...(body.firstName !== undefined && { firstName: body.firstName.trim() }),
        ...(body.lastName !== undefined && { lastName: body.lastName.trim() }),
        ...(body.middleName !== undefined && { middleName: body.middleName.trim() || undefined }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.address !== undefined && { permanentAddress: body.address }),
      }

      // Update human profile
      const humanRepository = HumanRepository.getInstance()
      const updatedHuman = await humanRepository.update(human.uuid, {
        fullName: fullName || human.fullName,
        dataIn: updatedDataIn as any,
      })

      // Parse updated dataIn for response
      let responseDataIn: ClientDataIn & Record<string, any> = {}
      if (updatedHuman.dataIn) {
        try {
          responseDataIn = typeof updatedHuman.dataIn === 'string' ? (JSON.parse(updatedHuman.dataIn) as ClientDataIn & Record<string, any>) : (updatedHuman.dataIn as ClientDataIn & Record<string, any>)
        } catch {
          responseDataIn = {}
        }
      }

      return NextResponse.json(
        {
          profile: {
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            name: updatedHuman.fullName || user.email,
            firstName: responseDataIn.firstName || undefined,
            lastName: responseDataIn.lastName || undefined,
            middleName: responseDataIn.middleName || undefined,
            phone: responseDataIn.phone || undefined,
            address: responseDataIn.permanentAddress || responseDataIn.registrationAddress || undefined,
            kycStatus: responseDataIn.kycStatus || 'not_started',
            kycDocuments: (responseDataIn.kycDocuments || []).map((doc) => {
              // Map backend types to frontend document IDs
              const typeMap: Record<string, string> = {
                'passport_registration': 'passport_registration',
                'other': 'income_certificate',
              }
              const frontendId = typeMap[doc.type] || doc.type
              
              return {
                id: frontendId,
                name: doc.type || '',
                status: (doc as any).status || 'pending',
                uploadedAt: doc.uploadedAt,
              }
            }),
          },
        },
        { status: 200 }
      )
    }

    // KYC Documents update
    if (!('kycDocuments' in body) || !Array.isArray(body.kycDocuments)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'kycDocuments must be an array',
        },
        { status: 400 }
      )
    }

    // Get human profile from user first (needed for ownership check)
    let human = user.human
    if (!human) {
      const meRepository = MeRepository.getInstance()
      const userWithRoles = await meRepository.findByIdWithRoles(Number(user.id), { includeHuman: true })
      human = userWithRoles?.human
    }

    if (!human) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Human profile not found',
        },
        { status: 404 }
      )
    }

    const userHaid = human.haid

    // Validate kycDocuments structure and check ownership
    const fileStorageService = FileStorageService.getInstance()
    
    const kycBody = body as UpdateProfileKycRequest
    
    for (const doc of kycBody.kycDocuments) {
      if (!doc.mediaUuid || !doc.type) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Each document must have mediaUuid and type',
          },
          { status: 400 }
        )
      }

      if (!['passport_main', 'passport_registration', 'selfie', 'selfie_with_passport', 'other'].includes(doc.type)) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: `Invalid document type: ${doc.type}`,
          },
          { status: 400 }
        )
      }

      // Verify that the file belongs to the current user
      try {
        const mediaMetadata = await fileStorageService.getMediaMetadata(doc.mediaUuid)
        
        if (!mediaMetadata) {
          return NextResponse.json(
            {
              success: false,
              error: 'NOT_FOUND',
              message: `File with UUID ${doc.mediaUuid} not found`,
            },
            { status: 404 }
          )
        }

        // Check ownership: uploaderAid must match current user's haid
        if (mediaMetadata.uploaderAid !== userHaid) {
          return NextResponse.json(
            {
              success: false,
              error: 'FORBIDDEN',
              message: `File with UUID ${doc.mediaUuid} does not belong to you`,
            },
            { status: 403 }
          )
        }
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: `Failed to verify file ownership for UUID ${doc.mediaUuid}`,
          },
          { status: 400 }
        )
      }

      // Ensure uploadedAt is present, set to current time if not provided
      if (!doc.uploadedAt) {
        doc.uploadedAt = new Date().toISOString()
      }
    }

    // human is already loaded above

    // Parse current dataIn
    const currentDataIn: ClientDataIn =
      typeof human.dataIn === 'string'
        ? (JSON.parse(human.dataIn) as ClientDataIn)
        : (human.dataIn as ClientDataIn) || {}

    // Update dataIn with new kycDocuments
    // Merge with existing documents if needed, or replace entirely
    const updatedDataIn: ClientDataIn = {
      ...currentDataIn,
      kycDocuments: kycBody.kycDocuments,
    }

    // If documents were added and status is not already pending/verified/rejected, set to pending
    const hasDocuments = kycBody.kycDocuments.length > 0
    const currentStatus = currentDataIn.kycStatus || 'not_started'
    
    if (hasDocuments && currentStatus === 'not_started') {
      updatedDataIn.kycStatus = 'pending'
    }

    // Update human profile
    const humanRepository = HumanRepository.getInstance()
    const updatedHuman = await humanRepository.update(human.uuid, {
      dataIn: updatedDataIn as any,
    })

    // If statusName needs to be updated to PENDING
    if (hasDocuments && human.statusName !== 'PENDING' && currentStatus === 'not_started') {
      const db = createDb()
      await db
        .update(schema.humans)
        .set({ statusName: 'PENDING' })
        .where(eq(schema.humans.uuid, human.uuid))
    }

    // Parse updated dataIn for response
    const responseDataIn =
      typeof updatedHuman.dataIn === 'string'
        ? (JSON.parse(updatedHuman.dataIn) as ClientDataIn)
        : (updatedHuman.dataIn as ClientDataIn) || {}

    return NextResponse.json(
      {
        success: true,
        profile: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          name: updatedHuman.fullName || user.email,
          kycStatus: responseDataIn.kycStatus || 'not_started',
          kycDocuments: (responseDataIn.kycDocuments || []) as KycDocumentRef[],
          statusName: updatedHuman.statusName,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update profile error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message,
      },
      { status: 500 }
    )
  }
}

export const GET = withClientGuard(handleGet, )
export const PUT = withClientGuard(handlePut, )

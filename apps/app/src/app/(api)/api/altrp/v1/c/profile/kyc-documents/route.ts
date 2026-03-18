import { NextResponse } from 'next/server'
import {  AuthenticatedRequestContext, withClientGuard } from '@/shared/api-guard'
import { MeRepository } from '@/shared/repositories/me.repository'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema'
import { eq } from 'drizzle-orm'
import type { ClientDataIn, KycDocumentRef } from '@/shared/types/altrp'

/**
 * POST /api/altrp/v1/c/profile/kyc-documents
 * Upload and save KYC document
 */
const handlePost = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { request, user } = context

  try {
    // Get human profile from user
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

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentType = formData.get('type') as string | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Файл не предоставлен',
        },
        { status: 400 }
      )
    }

    if (!documentType) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Тип документа не указан',
        },
        { status: 400 }
      )
    }

    // Map frontend document types to backend types
    const typeMap: Record<string, KycDocumentRef['type']> = {
      'passport_registration': 'passport_registration',
      'selfie_with_passport': 'selfie_with_passport',
      'income_certificate': 'other',
    }

    const backendType = typeMap[documentType]
    if (!backendType) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Неверный тип документа: ${documentType}`,
        },
        { status: 400 }
      )
    }

    // Check for HEIC/HEIF format (should be converted on client, but check as safety net)
    const fileName = file.name.toLowerCase()
    const mimeType = file.type.toLowerCase()
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || 
                   mimeType === 'image/heic' || mimeType === 'image/heif'
    
    if (isHeic) {
      console.log('HEIC file rejected on server', {
        documentType,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        humanAid: human.haid,
      })
      
      return NextResponse.json(
        {
          success: false,
          error: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Формат HEIC не поддерживается. Пожалуйста, загрузите JPG/PNG или включите "Наиболее совместимый" в настройках камеры iPhone.',
        },
        { status: 415 }
      )
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Разрешены только изображения (JPG, PNG, WebP) и PDF файлы',
        },
        { status: 400 }
      )
    }

    // Upload file
    const fileStorageService = FileStorageService.getInstance()
    const media = await fileStorageService.uploadFile(
      file,
      human.uuid, // entityUuid - human UUID
      file.name,
      human.haid // uploaderAid
    )

    // Parse current dataIn
    let dataIn: ClientDataIn & Record<string, any> = {}
    if (human.dataIn) {
      try {
        dataIn = typeof human.dataIn === 'string' 
          ? (JSON.parse(human.dataIn) as ClientDataIn & Record<string, any>) 
          : (human.dataIn as ClientDataIn & Record<string, any>)
      } catch (error) {
        console.error('Ошибка при парсинге human.dataIn:', error)
        dataIn = {}
      }
    }

    // Get existing kycDocuments or initialize empty array
    const existingDocuments: KycDocumentRef[] = dataIn.kycDocuments || []

    // Remove existing document of the same type if exists
    const filteredDocuments = existingDocuments.filter(doc => doc.type !== backendType)

    // Add new document
    const newDocument: KycDocumentRef = {
      mediaUuid: media.uuid,
      type: backendType,
      uploadedAt: new Date().toISOString(),
    }

    const updatedDocuments = [...filteredDocuments, newDocument]

    // Update dataIn
    const updatedDataIn: ClientDataIn & Record<string, any> = {
      ...dataIn,
      kycDocuments: updatedDocuments,
      // Set status to pending if documents were added and status is not_started
      kycStatus: dataIn.kycStatus === 'not_started' ? 'pending' : (dataIn.kycStatus || 'pending'),
    }

    // Update human profile
    const humanRepository = HumanRepository.getInstance()
    const currentStatus = dataIn.kycStatus || 'not_started'
    const hasDocuments = updatedDocuments.length > 0
    
    await humanRepository.update(human.uuid, {
      dataIn: updatedDataIn as any,
    })

    // If statusName needs to be updated to PENDING when documents are first added
    if (hasDocuments && human.statusName !== 'PENDING' && currentStatus === 'not_started') {
      const db = createDb()
      await db
        .update(schema.humans)
        .set({ statusName: 'PENDING' })
        .where(eq(schema.humans.uuid, human.uuid))
    }

    return NextResponse.json(
      {
        success: true,
        document: {
          id: documentType,
          mediaUuid: media.uuid,
          type: backendType,
          uploadedAt: newDocument.uploadedAt,
          fileName: media.fileName,
          url: media.url,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Upload KYC document error:', error)
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

export const POST = withClientGuard(handlePost)


import { NextResponse } from 'next/server'
import { withRoleGuard, AuthenticatedRequestContext, withClientGuard } from '@/shared/api-guard'
import { MeRepository } from '@/shared/repositories/me.repository'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'
import { PassportSelfieVerificationService } from '@/shared/services/recognition/passport-selfie-verification.service'
import { GoogleVisionProvider } from '@/shared/services/recognition/providers/google-vision.provider'
import { SelfieImageNormalizationService } from '@/shared/services/recognition/selfie-image-normalization.service'
import type { ClientDataIn, KycDocumentRef } from '@/shared/types/altrp'
import { NewaltrpMedia } from '@/shared/types/altrp-finance'

/**
 * POST /api/altrp/v1/c/profile/verify-selfie-with-passport
 * Upload selfie with passport and verify faces match
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

    // Check for HEIC/HEIF format (should be converted on client, but check as safety net)
    const fileName = file.name.toLowerCase()
    const mimeType = file.type.toLowerCase()
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || 
                   mimeType === 'image/heic' || mimeType === 'image/heif'
    
    if (isHeic) {
      console.log('HEIC file rejected on server (selfie)', {
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

    // Validate file type (only images allowed for selfie)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Разрешены только изображения (JPG, PNG, WebP)',
        },
        { status: 400 }
      )
    }

    // Check if passport document is already uploaded
    let dataIn: ClientDataIn & Record<string, any> = {}
    if (human.dataIn) {
      try {
        dataIn = typeof human.dataIn === 'string' 
          ? (JSON.parse(human.dataIn) as ClientDataIn & Record<string, any>) 
          : (human.dataIn as ClientDataIn & Record<string, any>)
      } catch (error) {
        console.error('Error parsing human.dataIn:', error)
        dataIn = {}
      }
    }

    const existingDocuments: KycDocumentRef[] = dataIn.kycDocuments || []

    // Initialize Google Vision provider early (used both for normalization and verification)
    let googleProvider: GoogleVisionProvider

    // Try to load service account credentials from JSON file path or JSON string
    const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

    if (serviceAccountPath || serviceAccountJson) {
      try {
        let credentials: any

        if (serviceAccountPath) {
          // Load from file path
          const fs = await import('fs/promises')
          const path = await import('path')
          const filePath = path.resolve(process.cwd(), serviceAccountPath)
          const fileContent = await fs.readFile(filePath, 'utf-8')
          credentials = JSON.parse(fileContent)
        } else if (serviceAccountJson) {
          // Load from JSON string in environment variable
          credentials = JSON.parse(serviceAccountJson)
        }

        googleProvider = new GoogleVisionProvider(credentials)
      } catch (error) {
        console.error('Failed to load Google service account credentials:', error)
        throw new Error(
          'Failed to load Google service account credentials. Please check GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON environment variable.'
        )
      }
    } else {
      // Fallback to API key (if still needed for backward compatibility)
      const apiKey = process.env.GOOGLE_VISION_API_KEY
      if (!apiKey || apiKey.trim() === '') {
        console.error('Google Vision credentials not configured')
        console.error('Please set either:')
        console.error('  - GOOGLE_SERVICE_ACCOUNT_PATH (path to JSON file)')
        console.error('  - GOOGLE_SERVICE_ACCOUNT_JSON (JSON string)')
        console.error('  - GOOGLE_VISION_API_KEY (API key, deprecated)')
        throw new Error(
          'Google Vision credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON environment variable.'
        )
      }
      googleProvider = new GoogleVisionProvider(apiKey.trim())
    }

    // Best-effort normalization: EXIF rotation + optional "mirror" fix before saving
    const normalizationService = new SelfieImageNormalizationService(googleProvider)
    const normalizedSelfie = await normalizationService.normalizeMirrorIfNeeded(file)

    // Upload selfie file (photo where person is holding passport)
    const fileStorageService = FileStorageService.getInstance()
    const selfieMedia = await fileStorageService.uploadFile(
      normalizedSelfie.file,
      human.uuid,
      normalizedSelfie.file.name,
      human.haid
    )

    // Remove existing selfie_with_passport document if exists
    const filteredDocuments = existingDocuments.filter(doc => doc.type !== 'selfie_with_passport')

    let verificationResult: Awaited<ReturnType<PassportSelfieVerificationService['verifySelfieWithPassport']>> | null = null
    let avatarMedia: Partial<NewaltrpMedia> | null = null
    let newDocument: KycDocumentRef

    // Always perform verification (passport should be visible in the photo)
    const verificationService = new PassportSelfieVerificationService(
      googleProvider,
      googleProvider
    )

    // Perform verification (passport should be visible in the same photo)
    let verificationError: string | null = null
    try {
      verificationResult = await verificationService.verifySelfieWithPassport(
        selfieMedia.uuid,
        selfieMedia.uuid, // Same photo - person holding passport
        human.uuid,
        process.env as any
      )

      // Extract and save avatar from selfie whenever a face is detected in the photo
      if (verificationResult.details.facesDetectedInSelfie >= 1) {
        avatarMedia = await verificationService.extractAvatarFromSelfie(
          selfieMedia.uuid,
          human.uuid,
          human.haid
        )
      }
    } catch (error) {
      // Log error for admin but don't show technical details to user
      verificationError = error instanceof Error ? error.message : 'Unknown verification error'
      console.error('Selfie verification error:', error)
      
      // Create a failed verification result
      verificationResult = {
        verified: false,
        faceMatch: { match: false, similarity: 0, confidence: 0, sourceImageFaces: 0, targetImageFaces: 0 },
        nameMatch: { match: false },
        details: {
          facesDetectedInSelfie: 0,
          facesDetectedInPassport: 0,
          passportNameExtracted: false,
          errors: [verificationError],
        },
        reasons: ['Verification failed due to error'],
      }
    }

    // Add new selfie document with verification result
    newDocument = {
      mediaUuid: selfieMedia.uuid,
      type: 'selfie_with_passport',
      uploadedAt: new Date().toISOString(),
      verificationResult: {
        facesMatch: verificationResult.faceMatch.match,
        confidence: verificationResult.faceMatch.similarity,
        details: JSON.stringify({
          verified: verificationResult.verified,
          facesInSelfie: verificationResult.details.facesDetectedInSelfie,
          facesInPassport: verificationResult.details.facesDetectedInPassport,
          nameMatch: verificationResult.nameMatch.match,
          passportRawText: verificationResult.details.passportRawText, // Весь текст с паспорта для админа
          reasons: verificationResult.reasons,
          reasonCodes: verificationResult.details.reasonCodes, // Structured reason codes
          highRisk: verificationResult.details.highRisk, // High risk flag
          error: verificationError, // Store error for admin
        }),
      },
    }

    const updatedDocuments = [...filteredDocuments, newDocument]

    // Update dataIn with new document, verification metadata, and avatar
    const updatedDataIn: ClientDataIn & Record<string, any> = {
      ...dataIn,
      kycDocuments: updatedDocuments,
      ...(verificationResult && {
        // Do NOT set kycStatus to verified automatically – this is done by admin
        // If high risk, set to more_info for manual review
        kycStatus: verificationResult.details.highRisk 
          ? 'more_info' 
          : (dataIn.kycStatus === 'not_started' ? 'pending' : (dataIn.kycStatus || 'pending')),
        lastSelfieVerification: {
          timestamp: new Date().toISOString(),
          verified: verificationResult.verified,
          faceMatchConfidence: verificationResult.faceMatch.similarity,
          error: verificationError || undefined, // Store error for admin
          highRisk: verificationResult.details.highRisk, // High risk flag
          reasonCodes: verificationResult.details.reasonCodes, // Reason codes
        },
      }),
      // Save avatar media if extraction was successful
      ...(avatarMedia && { avatarMedia }),
    }

    // Update human profile
    const humanRepository = HumanRepository.getInstance()
    await humanRepository.update(human.uuid, {
      dataIn: updatedDataIn as any,
    })

    // Determine response message based on verification result and errors
    let responseMessage: string
    let showVerificationDetails = true
    
    if (verificationError) {
      // API error - don't show verification details
      responseMessage = 'Селфи сохранено. Верификация временно недоступна. Попробуйте позже.'
      showVerificationDetails = false
    } else if (verificationResult) {
      if (verificationResult.verified) {
        responseMessage = 'Верификация пройдена успешно! Аватар сохранён.'
      } else {
        responseMessage = 'Верификация не пройдена. Пожалуйста, загрузите более четкое фото.'
      }
    } else {
      responseMessage = 'Селфи сохранено. Верификация будет выполнена после загрузки фото паспорта.'
      showVerificationDetails = false
    }

    return NextResponse.json(
      {
        success: true,
        verified: verificationResult?.verified ?? false,
        facesMatch: verificationError ? undefined : (verificationResult?.faceMatch.match ?? false),
        confidence: verificationError ? undefined : (verificationResult?.faceMatch.similarity ?? 0),
        message: responseMessage,
        details: showVerificationDetails && verificationResult ? {
          facesInSelfie: verificationResult.details.facesDetectedInSelfie,
          facesInPassport: verificationResult.details.facesDetectedInPassport,
          nameMatch: verificationResult.nameMatch.match,
          reasons: verificationResult.reasons,
        } : undefined,
        document: {
          id: 'selfie_with_passport',
          mediaUuid: selfieMedia.uuid,
          uploadedAt: newDocument.uploadedAt,
        },
        avatarExtracted: avatarMedia !== null,
        avatarMediaUuid: avatarMedia?.uuid,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Selfie verification error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: `Ошибка верификации: ${message}`,
      },
      { status: 500 }
    )
  }
}

export const POST = withClientGuard(handlePost)


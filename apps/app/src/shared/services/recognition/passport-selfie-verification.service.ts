import { FileStorageService } from '@/shared/services/storage/file-storage.service'
import { HumanRepository } from '../../repositories/human.repository'
import { DocumentRecognitionService } from './document-recognition.service'
import type { IFaceRecognitionProvider, IOcrProvider, FaceComparisonResult } from './providers'
import type { NewaltrpMedia } from '../../types/altrp-finance'
import { logUserJournalEvent } from '../user-journal.service'
import { createDb } from '../../repositories/utils'
import { schema } from '../../schema'
import { eq } from 'drizzle-orm'
import type { Env } from '../../types'
import sharp from 'sharp'
import { buildExtractPassportDataPrompt } from '@/shared/utils/prompts'
import { callGeminiWithServiceAccount } from '@/shared/services/gemini.service'

// Reason codes for structured error handling
export enum VerificationReasonCode {
  NO_FACES = 'NO_FACES',
  TOO_FEW_FACES = 'TOO_FEW_FACES',
  TOO_MANY_FACES = 'TOO_MANY_FACES',
  FACE_MISMATCH = 'FACE_MISMATCH',
  PASSPORT_NOT_READABLE = 'PASSPORT_NOT_READABLE',
  NO_FACE_IN_PASSPORT = 'NO_FACE_IN_PASSPORT',
  NAME_MISMATCH = 'NAME_MISMATCH',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  POSSIBLE_FOREIGN_PASSPORT = 'POSSIBLE_FOREIGN_PASSPORT',
}

export interface PassportSelfieVerificationResult {
  verified: boolean
  faceMatch: FaceComparisonResult
  nameMatch: {
    match: boolean
    passportName?: string
    userName?: string
    similarity?: number
  }
  details: {
    facesDetectedInSelfie: number
    facesDetectedInPassport: number
    passportNameExtracted: boolean
    passportRawText?: string // Весь текст, распознанный с паспорта
    errors?: string[]
    passportProfile?: {
      fullName?: string | null
      birthday?: string | null
    }
    reasonCodes?: VerificationReasonCode[] // Structured reason codes
    highRisk?: boolean // Flag for admin if suspicious
  }
  reasons?: string[]
  avatarMedia?: Partial<NewaltrpMedia>
}

/**
 * Passport Selfie Verification Service
 * Verifies that a user is holding their passport in a selfie photo
 * Uses pluggable providers for face recognition and OCR
 * 
 * @example
 * ```typescript
 * // Using Google Vision
 * const googleProvider = new GoogleVisionProvider(process.env.GOOGLE_VISION_API_KEY!)
 * const service = new PassportSelfieVerificationService(googleProvider, googleProvider)
 * 
 * // Using AWS Rekognition
 * const awsProvider = new AwsRekognitionProvider({
 *   region: process.env.AWS_REGION!,
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 * })
 * const service = new PassportSelfieVerificationService(awsProvider, awsProvider)
 * 
 * // Verify selfie with passport
 * const result = await service.verifySelfieWithPassport(
 *   selfieMediaUuid,
 *   passportMediaUuid,
 *   humanUuid
 * )
 * ```
 */
export class PassportSelfieVerificationService {
  private fileStorageService: FileStorageService
  private humanRepository: HumanRepository
  private documentRecognitionService: DocumentRecognitionService

  constructor(
    private faceProvider: IFaceRecognitionProvider,
    private ocrProvider: IOcrProvider
  ) {
    this.fileStorageService = FileStorageService.getInstance()
    this.humanRepository = HumanRepository.getInstance()
    this.documentRecognitionService = new DocumentRecognitionService(ocrProvider)
  }

  /**
   * Convert Blob to Uint8Array
   */
  private async blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    const arrayBuffer = await blob.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  /**
   * Normalize name for comparison
   */
  private normalizeName(name: string): string {
    return name
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/[Ё]/g, 'Е')
      .replace(/[ё]/g, 'е')
  }

  /**
   * Calculate name similarity using Levenshtein distance
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeName(name1)
    const normalized2 = this.normalizeName(name2)

    if (normalized1 === normalized2) {
      return 1.0
    }

    // Simple word-by-word comparison
    const words1 = normalized1.split(' ')
    const words2 = normalized2.split(' ')

    if (words1.length !== words2.length) {
      return this.levenshteinSimilarity(normalized1, normalized2)
    }

    // Compare each word
    let matches = 0
    for (let i = 0; i < words1.length; i++) {
      if (words1[i] === words2[i]) {
        matches++
      } else {
        const similarity = this.levenshteinSimilarity(words1[i], words2[i])
        if (similarity > 0.8) {
          matches += similarity
        }
      }
    }

    return matches / words1.length
  }

  /**
   * Calculate Levenshtein similarity (0-1 scale)
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0) return len2 === 0 ? 1 : 0
    if (len2 === 0) return 0

    const matrix: number[][] = []

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        )
      }
    }

    const distance = matrix[len1][len2]
    const maxLen = Math.max(len1, len2)
    return 1 - distance / maxLen
  }

  /**
   * Main verification method
   * Verifies a single photo where person is holding their passport
   */
  async verifySelfieWithPassport(
    selfieMediaUuid: string,
    passportMediaUuid: string, // Deprecated: kept for backward compatibility, not used
    humanUuid: string,
    env?: Env
  ): Promise<PassportSelfieVerificationResult> {
    const errors: string[] = []
    const reasons: string[] = []

    try {
      const reasonCodes: VerificationReasonCode[] = []
      let highRisk = false

      // 1. Get single image from storage (person holding passport)
      const selfieBlob = await this.fileStorageService.getFileContent(selfieMediaUuid)
      const selfieBytes = await this.blobToUint8Array(selfieBlob)

      // 2. Detect faces in the photo (should be 2 faces: one on selfie, one in passport)
      const faces = await this.faceProvider.detectFaces(selfieBytes)
      const selfieFaces = faces.length

      if (selfieFaces === 0) {
        reasons.push('Лица не обнаружены на фото')
        reasonCodes.push(VerificationReasonCode.NO_FACES)
      } else if (selfieFaces === 1) {
        reasons.push('Обнаружено только одно лицо. На фото должно быть видно ваше лицо и лицо в паспорте')
        reasonCodes.push(VerificationReasonCode.TOO_FEW_FACES)
      } else if (selfieFaces > 2) {
        reasons.push(`Обнаружено слишком много лиц (${selfieFaces}). На фото должно быть только ваше лицо и лицо в паспорте`)
        reasonCodes.push(VerificationReasonCode.TOO_MANY_FACES)
      }
      // Если обнаружено ровно 2 лица - это нормально (одно на селфи, одно в паспорте)

      // 3. Extract text from passport using OCR (from the same photo)
      const passportRecognition = await this.documentRecognitionService.recognizeDocument(
        selfieMediaUuid
      )

      // 3.1. Additionally try to extract structured profile data from passport text using Google Gemini
      let passportProfile: { fullName?: string | null; birthday?: string | null } | undefined

      let passportName: string | undefined
      let nameMatch: {
        match: boolean
        passportName?: string
        userName?: string
        similarity?: number
      } = { match: false }

      // Check if passport text was found
      const hasPassportText = passportRecognition.success && 
        (passportRecognition.recognizedData.fullName || 
         passportRecognition.recognizedData.passportNumber ||
         (passportRecognition.rawText && passportRecognition.rawText.length > 50)) // At least some text from passport

      if (!hasPassportText) {
        reasons.push('Не удалось распознать паспорт на фото. Убедитесь, что паспорт четко виден и читаем')
        reasonCodes.push(VerificationReasonCode.PASSPORT_NOT_READABLE)
      }

      if (passportRecognition.success) {
        // Prefer structured fullName from OCR if available
        if (passportRecognition.recognizedData.fullName) {
          passportName = passportRecognition.recognizedData.fullName
        }

        // If we have raw text, try to refine data via Gemini (service account)
        if (passportRecognition.rawText && passportRecognition.rawText.length > 0) {
          try {
            const prompt = buildExtractPassportDataPrompt(passportRecognition.rawText)
            const rawGemini = await callGeminiWithServiceAccount(prompt)
            console.log('rawGemini', rawGemini)
            const parsed = JSON.parse(rawGemini) as {
              fullName?: string | null
              birthday?: string | null
            }

            const extractedFullName =
              typeof parsed.fullName === 'string' && parsed.fullName.trim().length > 0
                ? parsed.fullName.trim()
                : null
            const extractedBirthday =
              typeof parsed.birthday === 'string' && parsed.birthday.trim().length > 0
                ? parsed.birthday.trim()
                : null

            passportProfile = {
              fullName: extractedFullName,
              birthday: extractedBirthday,
            }

            // If OCR didn't provide a name but Gemini did, use it for name matching
            if (!passportName && extractedFullName) {
              passportName = extractedFullName
            }
          } catch (geminiError) {
            console.error('Passport Gemini extraction error:', geminiError)
            errors.push('Не удалось дополнительно распознать данные паспорта через ИИ')
          }
        }
      }

      // 4. Get user's profile from database and UPDATE it from passport data
      const human = await this.humanRepository.findByUuid(humanUuid)
      if (!human) {
        errors.push('Профиль пользователя не найден')
      } else {
        const updates: Partial<{ fullName: string; birthday: string }> = {}

        // Choose name to use for profile: Gemini fullName -> OCR fullName
        const extractedFullName =
          (passportProfile?.fullName && passportProfile.fullName.trim()) ||
          (passportName && passportName.trim()) ||
          null

        if (extractedFullName) {
          const normalizedFullName = extractedFullName.trim()

          // Compare passport name with user's profile name (not just accept it)
          const userFullName = human.fullName || ''
          const normalizedUserFullName = userFullName.trim()
          
          // Also check dataIn for firstName/lastName if fullName is not set
          let userProfileName = normalizedUserFullName
          if (!userProfileName && human.dataIn) {
            const dataIn = typeof human.dataIn === 'string' 
              ? JSON.parse(human.dataIn) 
              : human.dataIn
            const firstName = dataIn?.firstName || ''
            const lastName = dataIn?.lastName || ''
            const middleName = dataIn?.middleName || ''
            if (firstName || lastName) {
              userProfileName = [lastName, firstName, middleName].filter(Boolean).join(' ').trim()
            }
          }

          // Calculate name similarity
          let nameSimilarity = 0
          if (userProfileName) {
            nameSimilarity = this.calculateNameSimilarity(normalizedFullName, userProfileName)
          } else {
            // If user has no name in profile yet, we can't verify - this is suspicious
            nameSimilarity = 0
            highRisk = true
            reasonCodes.push(VerificationReasonCode.NAME_MISMATCH)
            reasons.push('Имя из паспорта не совпадает с профилем пользователя или профиль не заполнен')
          }

          // Name match threshold: 0.8 similarity
          const nameMatchThreshold = 0.8
          const nameMatches = nameSimilarity >= nameMatchThreshold

          if (!nameMatches && userProfileName) {
            highRisk = true
            reasonCodes.push(VerificationReasonCode.NAME_MISMATCH)
            reasons.push(`Имя из паспорта "${normalizedFullName}" не совпадает с именем в профиле "${userProfileName}" (совпадение: ${(nameSimilarity * 100).toFixed(1)}%)`)
          }

          nameMatch = {
            match: nameMatches,
            passportName: normalizedFullName,
            userName: userProfileName || normalizedFullName,
            similarity: nameSimilarity,
          }
        } else {
          // Имя не смогли извлечь вообще
          nameMatch = { match: false }
          reasonCodes.push(VerificationReasonCode.PASSPORT_NOT_READABLE)
        }

        // Обновляем дату рождения, если Gemini смог ее извлечь
        const extractedBirthday =
          passportProfile?.birthday && passportProfile.birthday.trim().length > 0
            ? passportProfile.birthday.trim()
            : null

        if (extractedBirthday) {
          if (!human.birthday || String(human.birthday) !== extractedBirthday) {
            updates.birthday = extractedBirthday
          }
        }

        if (Object.keys(updates).length > 0) {
          try {
            await this.humanRepository.update(humanUuid, updates as any)
          } catch (updateError) {
            console.error('Failed to update human profile from passport data:', updateError)
            errors.push('Не удалось сохранить данные из паспорта в профиль пользователя')
          }
        }
      }

      // 5. Real face comparison: compare selfie face with passport face
      let faceMatch: FaceComparisonResult = {
        match: false,
        similarity: 0,
        confidence: 0,
        sourceImageFaces: 0,
        targetImageFaces: 0,
      }

      if (selfieFaces === 2) {
        // Determine which face is selfie (larger, usually top/center) and which is passport (smaller, usually bottom)
        // Sort faces by size (area) - larger is likely selfie, smaller is passport
        const sortedFaces = [...faces].sort((a, b) => {
          const areaA = a.boundingBox.width * a.boundingBox.height
          const areaB = b.boundingBox.width * b.boundingBox.height
          return areaB - areaA // Descending order
        })

        const selfieFace = sortedFaces[0] // Larger face (selfie)
        const passportFace = sortedFaces[1] // Smaller face (passport)

        // Extract face regions from the image
        try {
          const imageBuffer = Buffer.from(selfieBytes)
          const image = sharp(imageBuffer)
          const metadata = await image.metadata()

          if (metadata.width && metadata.height) {
            // Crop selfie face
            const selfieCrop = {
              left: Math.max(0, Math.floor(selfieFace.boundingBox.x)),
              top: Math.max(0, Math.floor(selfieFace.boundingBox.y)),
              width: Math.min(metadata.width - Math.floor(selfieFace.boundingBox.x), Math.ceil(selfieFace.boundingBox.width)),
              height: Math.min(metadata.height - Math.floor(selfieFace.boundingBox.y), Math.ceil(selfieFace.boundingBox.height)),
            }

            // Crop passport face
            const passportCrop = {
              left: Math.max(0, Math.floor(passportFace.boundingBox.x)),
              top: Math.max(0, Math.floor(passportFace.boundingBox.y)),
              width: Math.min(metadata.width - Math.floor(passportFace.boundingBox.x), Math.ceil(passportFace.boundingBox.width)),
              height: Math.min(metadata.height - Math.floor(passportFace.boundingBox.y), Math.ceil(passportFace.boundingBox.height)),
            }

            // Extract face images
            const [selfieFaceImage, passportFaceImage] = await Promise.all([
              image.extract(selfieCrop).jpeg().toBuffer(),
              image.extract(passportCrop).jpeg().toBuffer(),
            ])

            // Compare faces
            const comparisonResult = await this.faceProvider.compareFaces(
              new Uint8Array(selfieFaceImage),
              new Uint8Array(passportFaceImage),
              0.7 // Similarity threshold for face matching
            )

            faceMatch = {
              match: comparisonResult.match,
              similarity: comparisonResult.similarity,
              confidence: comparisonResult.confidence,
              sourceImageFaces: 1,
              targetImageFaces: 1,
            }

            // If faces don't match, it's high risk
            if (!comparisonResult.match) {
              highRisk = true
              reasonCodes.push(VerificationReasonCode.FACE_MISMATCH)
              reasons.push(`Лица не совпадают (совпадение: ${(comparisonResult.similarity * 100).toFixed(1)}%). Возможно, используется чужой паспорт.`)
            } else if (comparisonResult.similarity < 0.85 || comparisonResult.confidence < 0.7) {
              // Low confidence match - flag for manual review
              highRisk = true
              reasonCodes.push(VerificationReasonCode.LOW_CONFIDENCE)
              reasons.push(`Низкая уверенность в совпадении лиц (совпадение: ${(comparisonResult.similarity * 100).toFixed(1)}%, уверенность: ${(comparisonResult.confidence * 100).toFixed(1)}%). Требуется ручная проверка.`)
            }
          }
        } catch (faceComparisonError) {
          console.error('Face comparison error:', faceComparisonError)
          // Fallback to old logic if face extraction fails
          faceMatch = {
            match: selfieFaces === 2,
            similarity: selfieFaces === 2 ? 0.9 : 0,
            confidence: selfieFaces === 2 ? Math.min(faces[0]?.confidence || 0.8, faces[1]?.confidence || 0.8) : 0,
            sourceImageFaces: selfieFaces === 2 ? 1 : 0,
            targetImageFaces: selfieFaces === 2 ? 1 : 0,
          }
          // If we can't compare faces, it's suspicious
          if (selfieFaces === 2) {
            highRisk = true
            reasonCodes.push(VerificationReasonCode.LOW_CONFIDENCE)
            reasons.push('Не удалось сравнить лица. Требуется ручная проверка.')
          }
        }
      } else {
        // Not enough faces for comparison
        faceMatch = {
          match: false,
          similarity: 0,
          confidence: 0,
          sourceImageFaces: selfieFaces,
          targetImageFaces: 0,
        }
      }

      // 6. Determine overall verification result
      // Verification passes if:
      // - Exactly 2 faces detected (one on selfie, one in passport)
      // - Passport text detected
      // - Faces match (real comparison)
      // - Name matches (if extracted)
      // - No critical reasons found
      const faceDetected = selfieFaces === 2
      const facesMatch = faceMatch.match
      const criticalReasons = reasonCodes.filter(code => 
        code === VerificationReasonCode.FACE_MISMATCH || 
        code === VerificationReasonCode.POSSIBLE_FOREIGN_PASSPORT ||
        code === VerificationReasonCode.NAME_MISMATCH
      )
      
      const verified: boolean = Boolean(
        faceDetected && 
        hasPassportText && 
        facesMatch && 
        nameMatch.match && 
        criticalReasons.length === 0 &&
        !highRisk
      )

      // If high risk but not verified, add POSSIBLE_FOREIGN_PASSPORT code
      if (highRisk && !verified && !reasonCodes.includes(VerificationReasonCode.POSSIBLE_FOREIGN_PASSPORT)) {
        reasonCodes.push(VerificationReasonCode.POSSIBLE_FOREIGN_PASSPORT)
      }

      const result = {
        verified,
        faceMatch,
        nameMatch,
        details: {
          facesDetectedInSelfie: faceMatch.sourceImageFaces,
          facesDetectedInPassport: faceMatch.targetImageFaces,
          passportNameExtracted: !!passportName,
          passportRawText: passportRecognition.rawText, // Сохраняем весь текст с документа
          errors: errors.length > 0 ? errors : undefined,
          passportProfile,
          reasonCodes: reasonCodes.length > 0 ? reasonCodes : undefined,
          highRisk,
        },
        reasons: reasons.length > 0 ? reasons : undefined,
      }

      // 7. Log verification event to journal
      if (env && human) {
        try {
          // Find user by humanAid
          const db = createDb()
          const [user] = await db
            .select()
            .from(schema.users)
            .where(
              eq(schema.users.humanAid, human.haid)
            )
            .limit(1)
            .execute()

          if (user) {
            await logUserJournalEvent(
              env,
              'USER_JOURNAL_SELFIE_VERIFICATION',
              {
                id: user.id,
                uuid: user.uuid,
                email: user.email,
                humanAid: user.humanAid,
                dataIn: user.dataIn as any,
              },
              {
                verificationResult: {
                  verified: result.verified,
                  faceMatch: result.faceMatch.match,
                  faceMatchConfidence: result.faceMatch.similarity,
                  nameMatch: result.nameMatch.match,
                  nameMatchSimilarity: result.nameMatch.similarity,
                  facesDetectedInSelfie: result.details.facesDetectedInSelfie,
                  facesDetectedInPassport: result.details.facesDetectedInPassport,
                  passportRawText: result.details.passportRawText, // Весь текст с паспорта для админа
                  reasons: result.reasons,
                },
                selfieMediaUuid,
                passportMediaUuid,
              }
            )
          }
        } catch (journalError) {
          console.error('Failed to log selfie verification event', journalError)
          // Don't fail verification if journal logging fails
        }
      }

      return result
    } catch (error) {
      console.error('Passport selfie verification error:', error)
      
      const errorResult = {
        verified: false,
        faceMatch: { match: false, confidence: 0, similarity: 0, sourceImageFaces: 0, targetImageFaces: 0 },
        nameMatch: { match: false },
        details: {
          facesDetectedInSelfie: 0,
          facesDetectedInPassport: 0,
          passportNameExtracted: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        },
        reasons: ['Ошибка при выполнении верификации'],
      }

      // Log verification failure event to journal
      if (env) {
        try {
          const human = await this.humanRepository.findByUuid(humanUuid)
          if (human) {
            const db = createDb()
            const [user] = await db
              .select()
              .from(schema.users)
              .where(
                eq(schema.users.humanAid, human.haid)
              )
              .limit(1)
              .execute()

            if (user) {
              await logUserJournalEvent(
                env,
                'USER_JOURNAL_SELFIE_VERIFICATION',
                {
                  id: user.id,
                  uuid: user.uuid,
                  email: user.email,
                  humanAid: user.humanAid,
                  dataIn: user.dataIn as any,
                },
                {
                  verificationResult: {
                    verified: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                  },
                  selfieMediaUuid,
                  passportMediaUuid,
                }
              )
            }
          }
        } catch (journalError) {
          console.error('Failed to log selfie verification error event', journalError)
          // Don't fail verification if journal logging fails
        }
      }

      return errorResult
    }
  }

  /**
   * Extract and save avatar from selfie
   * Detects face, crops image around it, resizes to standard avatar size
   * and saves as a new media file
   */
  async extractAvatarFromSelfie(
    selfieMediaUuid: string,
    humanUuid: string,
    uploaderAid: string
  ): Promise<Partial<NewaltrpMedia> | null> {
    try {
      // 1. Get selfie image from storage
      const selfieBlob = await this.fileStorageService.getFileContent(selfieMediaUuid)
      const selfieBytes = await this.blobToUint8Array(selfieBlob)

      // 2. Detect faces in selfie
      const faces = await this.faceProvider.detectFaces(selfieBytes)

      if (faces.length === 0) {
        console.warn('No face detected in selfie for avatar extraction')
        return null
      }

      // 3. Choose the most likely "selfie" face.
      // For photos where the user holds a passport, there can be 2 faces:
      // one real face (usually larger) and one in the passport (usually smaller).
      const face = [...faces].sort((a, b) => {
        const areaA = a.boundingBox.width * a.boundingBox.height
        const areaB = b.boundingBox.width * b.boundingBox.height
        return areaB - areaA
      })[0]
      const { boundingBox } = face

      // 4. Load and process image with sharp
      const imageBuffer = Buffer.from(selfieBytes)
      const image = sharp(imageBuffer)
      const metadata = await image.metadata()

      if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions')
      }

      // Calculate crop area with some padding around face
      const padding = 0.3 // 30% padding around face
      const expandedWidth = boundingBox.width * (1 + padding)
      const expandedHeight = boundingBox.height * (1 + padding)
      
      // Calculate crop coordinates (ensure they're within image bounds)
      const left = Math.max(0, Math.floor(boundingBox.x - (expandedWidth - boundingBox.width) / 2))
      const top = Math.max(0, Math.floor(boundingBox.y - (expandedHeight - boundingBox.height) / 2))
      const width = Math.min(metadata.width - left, Math.ceil(expandedWidth))
      const height = Math.min(metadata.height - top, Math.ceil(expandedHeight))

      // 5. Crop and resize to standard avatar size (200x200)
      const avatarSize = 200
      const processedImage = await image
        .extract({ left, top, width, height })
        .resize(avatarSize, avatarSize, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 90 })
        .toBuffer()

      // 6. Create File object from buffer
      const avatarFile = new File(
        [new Uint8Array(processedImage)],
        `avatar-${humanUuid}-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      )

      // 7. Upload avatar file
      const avatarMedia = await this.fileStorageService.uploadFile(
        avatarFile,
        humanUuid,
        avatarFile.name,
        uploaderAid
      )

      return avatarMedia
    } catch (error) {
      console.error('Avatar extraction error:', error)
      // Don't fail the whole verification if avatar extraction fails
      // Just log and return null
      return null
    }
  }
}


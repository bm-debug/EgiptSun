import { FileStorageService } from '@/shared/services/storage/file-storage.service'
import { HumanRepository } from '../../repositories/human.repository'
import type { IOcrProvider } from './providers'
import type { altrpHuman, ClientDataIn } from '../../types/altrp'

export interface RecognizedDocumentData {
  fullName?: string
  birthday?: string
  sex?: string
  passportNumber?: string
  passportSeries?: string
  passportIssueDate?: string
  passportIssuedBy?: string
  registrationAddress?: string
  [key: string]: string | undefined
}

export interface DocumentRecognitionResult {
  success: boolean
  recognizedData: RecognizedDocumentData
  rawText?: string
  confidence?: number
  error?: string
}

/**
 * Document Recognition Service
 * Recognizes text from document images and extracts personal information
 * Uses a pluggable OCR provider (Google Vision or AWS Rekognition)
 * 
 * @example
 * ```typescript
 * // Using Google Vision
 * const googleProvider = new GoogleVisionProvider(process.env.GOOGLE_VISION_API_KEY!)
 * const service = new DocumentRecognitionService(googleProvider)
 * 
 * // Using AWS Rekognition
 * const awsProvider = new AwsRekognitionProvider({
 *   region: process.env.AWS_REGION!,
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 * })
 * const service = new DocumentRecognitionService(awsProvider)
 * 
 * // Recognize and update human
 * const result = await service.recognizeAndUpdateHuman(mediaUuid, humanUuid)
 * ```
 */
export class DocumentRecognitionService {
  private fileStorageService: FileStorageService
  private humanRepository: HumanRepository

  constructor(private ocrProvider: IOcrProvider) {
    this.fileStorageService = FileStorageService.getInstance()
    this.humanRepository = HumanRepository.getInstance()
  }

  /**
   * Convert Blob to Uint8Array
   */
  private async blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    const arrayBuffer = await blob.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  /**
   * Parse recognized text and extract document data
   */
  private parseDocumentText(text: string): RecognizedDocumentData {
    const data: RecognizedDocumentData = {}
    const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)

    // Extract full name (usually appears in first few lines)
    const namePattern = /^[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+/i
    for (const line of lines.slice(0, 5)) {
      if (namePattern.test(line)) {
        data.fullName = line
        break
      }
    }

    // Extract date of birth (format: ДД.ММ.ГГГГ)
    const datePattern = /(\d{2}\.\d{2}\.\d{4})/
    for (const line of lines) {
      const dateMatch = line.match(datePattern)
      if (dateMatch) {
        if (!data.birthday) {
          data.birthday = dateMatch[1]
        } else if (!data.passportIssueDate) {
          data.passportIssueDate = dateMatch[1]
        }
      }
    }

    // Extract passport series and number (XXXX XXXXXX)
    const passportPattern = /(\d{4})\s+(\d{6})/
    for (const line of lines) {
      const passportMatch = line.match(passportPattern)
      if (passportMatch) {
        data.passportSeries = passportMatch[1]
        data.passportNumber = passportMatch[2]
        break
      }
    }

    // Extract sex (М/Ж or МУЖ/ЖЕН)
    const sexPattern = /(М|Ж|МУЖ|ЖЕН|MALE|FEMALE)/i
    for (const line of lines) {
      const sexMatch = line.match(sexPattern)
      if (sexMatch) {
        const sexValue = sexMatch[1].toUpperCase()
        if (sexValue === 'М' || sexValue === 'МУЖ' || sexValue === 'MALE') {
          data.sex = 'M'
        } else if (sexValue === 'Ж' || sexValue === 'ЖЕН' || sexValue === 'FEMALE') {
          data.sex = 'F'
        }
        break
      }
    }

    // Extract passport issued by
    const issuedByPattern = /(УФМС|ОВД|МВД|ГУВД|УВД|ОТДЕЛ|ОТДЕЛЕНИЕ).*?(\d{3}-\d{3})?/i
    for (const line of lines) {
      const issuedByMatch = line.match(issuedByPattern)
      if (issuedByMatch) {
        data.passportIssuedBy = line.trim()
        break
      }
    }

    return data
  }

  /**
   * Recognize document from media UUID and update human record
   */
  async recognizeAndUpdateHuman(
    mediaUuid: string,
    humanUuid: string
  ): Promise<DocumentRecognitionResult> {
    try {
      // 1. Get image from storage
      const imageBlob = await this.fileStorageService.getFileContent(mediaUuid)
      const mediaMetadata = await this.fileStorageService.getMediaMetadata(mediaUuid)

      if (!mediaMetadata) {
        throw new Error('Media metadata not found')
      }

      // 2. Convert to Uint8Array
      const imageBytes = await this.blobToUint8Array(imageBlob)

      // 3. Recognize text using OCR provider
      const ocrResult = await this.ocrProvider.detectText(imageBytes)

      if (!ocrResult.fullText || ocrResult.fullText.trim().length === 0) {
        return {
          success: false,
          recognizedData: {},
          rawText: '',
          error: 'No text recognized from image',
        }
      }

      // 4. Parse document data
      const recognizedData = this.parseDocumentText(ocrResult.fullText)

      // 5. Get current human record
      const human = await this.humanRepository.findByUuid(humanUuid)
      if (!human) {
        throw new Error('Human not found')
      }

      // 6. Prepare update data (only update empty fields)
      const updateData: Partial<altrpHuman> = {}

      if (recognizedData.fullName && !human.fullName) {
        updateData.fullName = recognizedData.fullName
      }

      if (recognizedData.birthday && !human.birthday) {
        updateData.birthday = recognizedData.birthday
      }

      if (recognizedData.sex && !human.sex) {
        updateData.sex = recognizedData.sex
      }

      // Update dataIn with passport information if available
      let dataIn: ClientDataIn & Record<string, any> = {}
      if (human.dataIn) {
        try {
          dataIn =
            typeof human.dataIn === 'string'
              ? (JSON.parse(human.dataIn) as ClientDataIn & Record<string, any>)
              : (human.dataIn as ClientDataIn & Record<string, any>)
        } catch (error) {
          console.error('Error parsing human.dataIn:', error)
          dataIn = {}
        }
      }

      // Add passport data to dataIn if not already present
      const passportData: Record<string, string> = {}
      if (recognizedData.passportSeries && !dataIn.passportSeries) {
        passportData.passportSeries = recognizedData.passportSeries
      }
      if (recognizedData.passportNumber && !dataIn.passportNumber) {
        passportData.passportNumber = recognizedData.passportNumber
      }
      if (recognizedData.passportIssueDate && !dataIn.passportIssueDate) {
        passportData.passportIssueDate = recognizedData.passportIssueDate
      }
      if (recognizedData.passportIssuedBy && !dataIn.passportIssuedBy) {
        passportData.passportIssuedBy = recognizedData.passportIssuedBy
      }
      if (recognizedData.registrationAddress && !dataIn.registrationAddress) {
        passportData.registrationAddress = recognizedData.registrationAddress
      }

      if (Object.keys(passportData).length > 0) {
        updateData.dataIn = {
          ...dataIn,
          ...passportData,
        } as ClientDataIn
      }

      // 7. Update human record if there's data to update
      if (Object.keys(updateData).length > 0) {
        await this.humanRepository.update(humanUuid, updateData)
      }

      return {
        success: true,
        recognizedData,
        rawText: ocrResult.fullText,
        confidence: ocrResult.confidence,
      }
    } catch (error) {
      console.error('Document recognition error:', error)
      return {
        success: false,
        recognizedData: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Recognize document from media UUID only (without updating human)
   */
  async recognizeDocument(mediaUuid: string): Promise<DocumentRecognitionResult> {
    try {
      // 1. Get image from storage
      const imageBlob = await this.fileStorageService.getFileContent(mediaUuid)
      const mediaMetadata = await this.fileStorageService.getMediaMetadata(mediaUuid)

      if (!mediaMetadata) {
        throw new Error('Media metadata not found')
      }

      // 2. Convert to Uint8Array
      const imageBytes = await this.blobToUint8Array(imageBlob)

      // 3. Recognize text using OCR provider
      const ocrResult = await this.ocrProvider.detectText(imageBytes)

      if (!ocrResult.fullText || ocrResult.fullText.trim().length === 0) {
        return {
          success: false,
          recognizedData: {},
          rawText: '',
          error: 'No text recognized from image',
        }
      }

      // 4. Parse document data
      const recognizedData = this.parseDocumentText(ocrResult.fullText)

      return {
        success: true,
        recognizedData,
        rawText: ocrResult.fullText,
        confidence: ocrResult.confidence,
      }
    } catch (error) {
      console.error('Document recognition error:', error)
      return {
        success: false,
        recognizedData: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}


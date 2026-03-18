import type { IFaceRecognitionProvider, FaceComparisonResult } from './providers'

/**
 * Face Matching Service Result
 */
export interface FaceMatchResult {
  match: boolean
  similarity: number // 0-1 scale
  confidence: number // 0-1 scale
  details: {
    facesInFirst: number
    facesInSecond: number
    reasons?: string[]
  }
}

/**
 * Face Matching Service
 * Compares two face images using a pluggable face recognition provider
 * 
 * @example
 * ```typescript
 * // Using Google Vision
 * const googleProvider = new GoogleVisionProvider(process.env.GOOGLE_VISION_API_KEY!)
 * const service = new FaceMatchingService(googleProvider)
 * 
 * // Using AWS Rekognition
 * const awsProvider = new AwsRekognitionProvider({
 *   region: process.env.AWS_REGION!,
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
 * })
 * const service = new FaceMatchingService(awsProvider)
 * 
 * // Compare faces
 * const result = await service.compareFacesFromBlobs(selfieBlob, passportPhotoBlob)
 * if (result.match) {
 *   console.log('Faces match!', result.similarity)
 * }
 * ```
 */
export class FaceMatchingService {
  constructor(private faceProvider: IFaceRecognitionProvider) {}

  /**
   * Convert Blob to Uint8Array
   */
  private async blobToUint8Array(blob: Blob): Promise<Uint8Array> {
    const arrayBuffer = await blob.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  /**
   * Compare two face images from Blobs
   * @param firstPhoto - First image (e.g., selfie)
   * @param secondPhoto - Second image (e.g., passport photo)
   * @param similarityThreshold - Minimum similarity to consider a match (default: 0.8)
   */
  async compareFacesFromBlobs(
    firstPhoto: Blob,
    secondPhoto: Blob,
    similarityThreshold: number = 0.8
  ): Promise<FaceMatchResult> {
    const reasons: string[] = []

    try {
      // Convert blobs to Uint8Array
      const [firstBytes, secondBytes] = await Promise.all([
        this.blobToUint8Array(firstPhoto),
        this.blobToUint8Array(secondPhoto),
      ])

      // Compare faces using provider
      const result: FaceComparisonResult = await this.faceProvider.compareFaces(
        firstBytes,
        secondBytes,
        similarityThreshold
      )

      // Check for issues
      if ((result.sourceImageFaces ?? 0) === 0) {
        reasons.push('No face detected in first image')
      }
      if ((result.sourceImageFaces ?? 0) > 1) {
        reasons.push('Multiple faces detected in first image')
      }
      if ((result.targetImageFaces ?? 0) === 0) {
        reasons.push('No face detected in second image')
      }
      if ((result.targetImageFaces ?? 0) > 1) {
        reasons.push('Multiple faces detected in second image')
      }

      if (!result.match) {
        reasons.push(
          `Faces do not match (similarity: ${(result.similarity * 100).toFixed(1)}%, threshold: ${(similarityThreshold * 100).toFixed(1)}%)`
        )
      }

      if (result.confidence < 0.7) {
        reasons.push(`Low confidence: ${(result.confidence * 100).toFixed(1)}%`)
      }

      return {
        match: result.match,
        similarity: result.similarity,
        confidence: result.confidence,
        details: {
          facesInFirst: result.sourceImageFaces ?? 0,
          facesInSecond: result.targetImageFaces ?? 0,
          reasons: reasons.length > 0 ? reasons : undefined,
        },
      }
    } catch (error) {
      console.error('Face matching error:', error)
      return {
        match: false,
        similarity: 0,
        confidence: 0,
        details: {
          facesInFirst: 0,
          facesInSecond: 0,
          reasons: [error instanceof Error ? error.message : 'Unknown error'],
        },
      }
    }
  }

  /**
   * Compare two face images from Uint8Array
   */
  async compareFacesFromBytes(
    firstImageBytes: Uint8Array,
    secondImageBytes: Uint8Array,
    similarityThreshold: number = 0.8
  ): Promise<FaceMatchResult> {
    const reasons: string[] = []

    try {
      // Compare faces using provider
      const result: FaceComparisonResult = await this.faceProvider.compareFaces(
        firstImageBytes,
        secondImageBytes,
        similarityThreshold
      )

      // Check for issues
      if ((result.sourceImageFaces ?? 0) === 0) {
        reasons.push('No face detected in first image')
      }
      if ((result.sourceImageFaces ?? 0) > 1) {
        reasons.push('Multiple faces detected in first image')
      }
      if ((result.targetImageFaces ?? 0) === 0) {
        reasons.push('No face detected in second image')
      }
      if ((result.targetImageFaces ?? 0) > 1) {
        reasons.push('Multiple faces detected in second image')
      }

      if (!result.match) {
        reasons.push(
          `Faces do not match (similarity: ${(result.similarity * 100).toFixed(1)}%, threshold: ${(similarityThreshold * 100).toFixed(1)}%)`
        )
      }

      if (result.confidence < 0.7) {
        reasons.push(`Low confidence: ${(result.confidence * 100).toFixed(1)}%`)
      }

      return {
        match: result.match,
        similarity: result.similarity,
        confidence: result.confidence,
        details: {
          facesInFirst: result.sourceImageFaces ?? 0,
          facesInSecond: result.targetImageFaces ?? 0,
          reasons: reasons.length > 0 ? reasons : undefined,
        },
      }
    } catch (error) {
      console.error('Face matching error:', error)
      return {
        match: false,
        similarity: 0,
        confidence: 0,
        details: {
          facesInFirst: 0,
          facesInSecond: 0,
          reasons: [error instanceof Error ? error.message : 'Unknown error'],
        },
      }
    }
  }
}


import {
  RekognitionClient,
  DetectFacesCommand,
  CompareFacesCommand,
  DetectTextCommand,
  type DetectFacesCommandInput,
  type CompareFacesCommandInput,
  type DetectTextCommandInput,
  type FaceDetail,
  type Landmark,
  type TextDetection as AwsTextDetection,
} from '@aws-sdk/client-rekognition'
import type {
  IFaceRecognitionProvider,
  IOcrProvider,
  FaceDetection,
  FaceComparisonResult,
  OcrResult,
  TextDetection,
} from './types'

/**
 * AWS Rekognition Provider
 * Implements face recognition and OCR using AWS Rekognition
 */
export class AwsRekognitionProvider implements IFaceRecognitionProvider, IOcrProvider {
  private client: RekognitionClient

  constructor(config: { region: string; accessKeyId: string; secretAccessKey: string }) {
    if (!config.region || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('AWS credentials (region, accessKeyId, secretAccessKey) are required')
    }

    this.client = new RekognitionClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  /**
   * Detect faces in an image using AWS Rekognition
   */
  async detectFaces(imageBytes: Uint8Array): Promise<FaceDetection[]> {
    const input: DetectFacesCommandInput = {
      Image: {
        Bytes: imageBytes,
      },
      Attributes: ['ALL'],
    }

    const command = new DetectFacesCommand(input)
    const response = await this.client.send(command)

    const faceDetails = response.FaceDetails || []

    return faceDetails.map((face: FaceDetail) => {
      const box = face.BoundingBox || {}
      // AWS returns normalized coordinates (0-1), we'll keep them as is
      // In production, you might want to denormalize based on image dimensions

      return {
        boundingBox: {
          x: box.Left || 0,
          y: box.Top || 0,
          width: box.Width || 0,
          height: box.Height || 0,
        },
        confidence: (face.Confidence || 0) / 100, // Convert to 0-1 scale
        landmarks: face.Landmarks?.map((landmark: Landmark) => ({
          type: landmark.Type || '',
          position: {
            x: landmark.X || 0,
            y: landmark.Y || 0,
          },
        })),
      }
    })
  }

  /**
   * Compare two faces using AWS Rekognition CompareFaces
   */
  async compareFaces(
    sourceImageBytes: Uint8Array,
    targetImageBytes: Uint8Array,
    similarityThreshold: number = 0.8
  ): Promise<FaceComparisonResult> {
    try {
      const input: CompareFacesCommandInput = {
        SourceImage: {
          Bytes: sourceImageBytes,
        },
        TargetImage: {
          Bytes: targetImageBytes,
        },
        SimilarityThreshold: similarityThreshold * 100, // AWS expects 0-100
      }

      const command = new CompareFacesCommand(input)
      const response = await this.client.send(command)

      const faceMatches = response.FaceMatches || []
      const unmatchedFaces = response.UnmatchedFaces || []
      const sourceImageFace = response.SourceImageFace

      // Get the best match (first one, as AWS returns sorted by similarity)
      const bestMatch = faceMatches[0]

      if (bestMatch) {
        const similarity = (bestMatch.Similarity || 0) / 100 // Convert to 0-1 scale
        const confidence = (bestMatch.Face?.Confidence || 0) / 100 // Convert to 0-1 scale

        return {
          match: true,
          similarity,
          confidence,
          sourceImageFaces: sourceImageFace ? 1 : 0,
          targetImageFaces: faceMatches.length + unmatchedFaces.length,
        }
      }

      // No match found
      return {
        match: false,
        similarity: 0,
        confidence: sourceImageFace ? (sourceImageFace.Confidence || 0) / 100 : 0,
        sourceImageFaces: sourceImageFace ? 1 : 0,
        targetImageFaces: unmatchedFaces.length,
      }
    } catch (error) {
      console.error('AWS Rekognition face comparison error:', error)
      throw error
    }
  }

  /**
   * Detect text in an image using AWS Rekognition
   */
  async detectText(imageBytes: Uint8Array): Promise<OcrResult> {
    const input: DetectTextCommandInput = {
      Image: {
        Bytes: imageBytes,
      },
    }

    const command = new DetectTextCommand(input)
    const response = await this.client.send(command)

    const textDetections = response.TextDetections || []

    // Separate LINE and WORD detections
    const lineDetections = textDetections.filter((d: AwsTextDetection) => d.Type === 'LINE')
    const wordDetections = textDetections.filter((d: AwsTextDetection) => d.Type === 'WORD')

    // Build full text from lines (or words if no lines)
    const primaryDetections = lineDetections.length > 0 ? lineDetections : wordDetections
    const fullText = primaryDetections.map((d: AwsTextDetection) => d.DetectedText || '').join('\n')

    // Map all detections to our format
    const detections: TextDetection[] = textDetections.map((detection: AwsTextDetection) => {
      const geometry = detection.Geometry?.BoundingBox || {}

      return {
        text: detection.DetectedText || '',
        confidence: (detection.Confidence || 0) / 100, // Convert to 0-1 scale
        boundingBox: {
          x: geometry.Left || 0,
          y: geometry.Top || 0,
          width: geometry.Width || 0,
          height: geometry.Height || 0,
        },
      }
    })

    // Calculate average confidence
    const avgConfidence =
      detections.length > 0
        ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
        : 0

    return {
      fullText,
      detections,
      confidence: avgConfidence,
    }
  }
}


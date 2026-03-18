/**
 * Common types for recognition providers
 */

/**
 * Bounding box coordinates
 */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Face landmark point
 */
export interface FaceLandmark {
  type: string
  position: {
    x: number
    y: number
  }
}

/**
 * Face detection result
 */
export interface FaceDetection {
  boundingBox: BoundingBox
  confidence: number
  landmarks?: FaceLandmark[]
}

/**
 * Face comparison result
 */
export interface FaceComparisonResult {
  match: boolean
  similarity: number
  confidence: number
  sourceImageFaces: number
  targetImageFaces: number
}

/**
 * Text detection result for a single text region
 */
export interface TextDetection {
  text: string
  confidence: number
  boundingBox: BoundingBox
}

/**
 * OCR result containing all detected text
 */
export interface OcrResult {
  fullText: string
  detections: TextDetection[]
  confidence: number
}

/**
 * Face recognition provider interface
 */
export interface IFaceRecognitionProvider {
  /**
   * Detect faces in an image
   */
  detectFaces(imageBytes: Uint8Array): Promise<FaceDetection[]>

  /**
   * Compare two faces
   */
  compareFaces(
    sourceImageBytes: Uint8Array,
    targetImageBytes: Uint8Array,
    similarityThreshold?: number
  ): Promise<FaceComparisonResult>
}

/**
 * OCR provider interface
 */
export interface IOcrProvider {
  /**
   * Detect text in an image
   */
  detectText(imageBytes: Uint8Array): Promise<OcrResult>
}


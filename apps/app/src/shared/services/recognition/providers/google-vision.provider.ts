import type {
  IFaceRecognitionProvider,
  IOcrProvider,
  FaceDetection,
  FaceComparisonResult,
  OcrResult,
  TextDetection,
} from './types'

/**
 * Google Vision API Provider
 * Implements face recognition and OCR using Google Cloud Vision API
 * Supports both API key and service account JSON authentication
 */
export class GoogleVisionProvider implements IFaceRecognitionProvider, IOcrProvider {
  private apiKey?: string
  private serviceAccountCredentials?: any
  private accessToken?: string
  private tokenExpiry?: number

  constructor(apiKeyOrCredentials: string | object) {
    if (typeof apiKeyOrCredentials === 'string') {
      // API key authentication (legacy)
      if (!apiKeyOrCredentials || apiKeyOrCredentials.trim() === '') {
        throw new Error('Google Vision API key is required and cannot be empty')
      }
      this.apiKey = apiKeyOrCredentials.trim()
    } else if (typeof apiKeyOrCredentials === 'object' && apiKeyOrCredentials !== null) {
      // Service account JSON credentials
      this.serviceAccountCredentials = apiKeyOrCredentials
      if (!this.serviceAccountCredentials.client_email || !this.serviceAccountCredentials.private_key) {
        throw new Error('Invalid service account credentials: client_email and private_key are required')
      }
      
      // Validate private key format
      const privateKey = String(this.serviceAccountCredentials.private_key)
      if (!privateKey.includes('BEGIN') || !privateKey.includes('END')) {
        console.warn('Private key may be in incorrect format. Expected format: -----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----')
      }
    } else {
      throw new Error('Google Vision API key or service account credentials are required')
    }
  }

  /**
   * Convert Uint8Array to base64 string
   * Uses chunking to avoid stack overflow on large arrays
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    // Use chunking approach to avoid "Maximum call stack size exceeded" error
    const chunkSize = 8192 // Process in chunks of 8KB
    let binaryString = ''
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize)
      binaryString += String.fromCharCode(...chunk)
    }
    
    return btoa(binaryString)
  }

  /**
   * Get access token from service account credentials using JWT
   */
  private async getAccessToken(): Promise<string> {
    if (!this.serviceAccountCredentials) {
      throw new Error('Service account credentials not configured')
    }

    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken
    }

    // Create JWT for service account
    let jwt: string
    try {
      jwt = await this.createJWT()
    } catch (jwtError) {
      console.error('Failed to create JWT:', jwtError)
      throw new Error(`Failed to create JWT: ${jwtError instanceof Error ? jwtError.message : 'Unknown error'}`)
    }

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token request failed:', {
        status: tokenResponse.status,
        error: errorText,
        clientEmail: this.serviceAccountCredentials.client_email,
        hasPrivateKey: !!this.serviceAccountCredentials.private_key,
      })
      throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`)
    }

    const tokenData = await tokenResponse.json() as { access_token: string; expires_in: number }
    this.accessToken = tokenData.access_token
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000)

    return this.accessToken
  }

  /**
   * Create JWT token for service account authentication
   */
  private async createJWT(): Promise<string> {
    if (!this.serviceAccountCredentials) {
      throw new Error('Service account credentials not configured')
    }

    // Import crypto for JWT signing (Node.js built-in)
    const crypto = await import('crypto')

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    }

    const now = Math.floor(Date.now() / 1000)
    const claim = {
      iss: this.serviceAccountCredentials.client_email,
      sub: this.serviceAccountCredentials.client_email,
      aud: 'https://oauth2.googleapis.com/token', // Correct audience for OAuth2 token endpoint
      iat: now,
      exp: now + 3600, // Token expires in 1 hour
      scope: 'https://www.googleapis.com/auth/cloud-platform',
    }

    // Encode to base64url (URL-safe base64)
    const base64UrlEncode = (str: string): string => {
      return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
    }

    const encodedHeader = base64UrlEncode(JSON.stringify(header))
    const encodedClaim = base64UrlEncode(JSON.stringify(claim))
    const signatureInput = `${encodedHeader}.${encodedClaim}`

    // Sign with private key
    // Handle private key format - it might come with escaped newlines or actual newlines
    let privateKey = this.serviceAccountCredentials.private_key
    if (typeof privateKey === 'string') {
      // Replace escaped newlines with actual newlines (common in JSON files)
      // Handle both \\n (double escaped) and \n (single escaped)
      privateKey = privateKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n')
      
      // Ensure proper key format - Google service account keys should have BEGIN/END markers
      if (!privateKey.includes('BEGIN')) {
        console.error('Private key format issue: missing BEGIN marker')
        throw new Error('Invalid private key format: missing BEGIN marker')
      }
      
      // Trim any extra whitespace
      privateKey = privateKey.trim()
    } else {
      throw new Error('Private key must be a string')
    }

    try {
      const sign = crypto.createSign('RSA-SHA256')
      sign.update(signatureInput, 'utf8')
      // Sign returns a Buffer
      // Use the private key directly - crypto will handle both formats:
      // - "-----BEGIN PRIVATE KEY-----" (PKCS#8)
      // - "-----BEGIN RSA PRIVATE KEY-----" (PKCS#1)
      const signatureBuffer = sign.sign(privateKey)
      
      // Convert Buffer directly to base64url (URL-safe base64)
      // base64url replaces + with -, / with _, and removes padding =
      const signature = signatureBuffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')

      return `${signatureInput}.${signature}`
    } catch (signError) {
      console.error('JWT signing error:', signError)
      const keyPreview = privateKey.substring(0, 100)
      console.error('Private key preview:', keyPreview)
      console.error('Private key length:', privateKey.length)
      console.error('Private key has BEGIN PRIVATE KEY:', privateKey.includes('BEGIN PRIVATE KEY'))
      console.error('Private key has BEGIN RSA PRIVATE KEY:', privateKey.includes('BEGIN RSA PRIVATE KEY'))
      console.error('Private key has END marker:', privateKey.includes('END'))
      throw new Error(`Failed to sign JWT: ${signError instanceof Error ? signError.message : 'Unknown error'}`)
    }
  }

  /**
   * Detect faces in an image using Google Vision API
   */
  async detectFaces(imageBytes: Uint8Array): Promise<FaceDetection[]> {
    const imageBase64 = this.uint8ArrayToBase64(imageBytes)

    // Build URL and headers based on authentication method
    let url: string
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      // API key authentication
      url = `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`
    } else if (this.serviceAccountCredentials) {
      // Service account authentication
      url = 'https://vision.googleapis.com/v1/images:annotate'
      const accessToken = await this.getAccessToken()
      headers['Authorization'] = `Bearer ${accessToken}`
    } else {
      throw new Error('Google Vision API key or service account credentials are not configured')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBase64,
            },
            features: [
              {
                type: 'FACE_DETECTION',
                maxResults: 10,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as any

    if (data.responses?.[0]?.error) {
      throw new Error(`Google Vision API error: ${JSON.stringify(data.responses[0].error)}`)
    }

    const faceAnnotations = data.responses?.[0]?.faceAnnotations || []

    return faceAnnotations.map((face: any) => {
      const vertices = face.boundingPoly?.vertices || []
      const minX = Math.min(...vertices.map((v: any) => v.x || 0))
      const minY = Math.min(...vertices.map((v: any) => v.y || 0))
      const maxX = Math.max(...vertices.map((v: any) => v.x || 0))
      const maxY = Math.max(...vertices.map((v: any) => v.y || 0))

      return {
        boundingBox: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        },
        confidence: face.detectionConfidence || 0,
        landmarks: face.landmarks?.map((landmark: any) => ({
          type: landmark.type,
          position: {
            x: landmark.position.x || 0,
            y: landmark.position.y || 0,
          },
        })),
      }
    })
  }

  /**
   * Compare two faces using Google Vision API
   * Note: Google Vision doesn't have direct face comparison API,
   * so we detect faces and compare their landmarks manually
   */
  async compareFaces(
    sourceImageBytes: Uint8Array,
    targetImageBytes: Uint8Array,
    similarityThreshold: number = 0.8
  ): Promise<FaceComparisonResult> {
    try {
      // Detect faces in both images
      const [sourceFaces, targetFaces] = await Promise.all([
        this.detectFaces(sourceImageBytes),
        this.detectFaces(targetImageBytes),
      ])

      if (sourceFaces.length === 0 || targetFaces.length === 0) {
        return {
          match: false,
          similarity: 0,
          confidence: 0,
          sourceImageFaces: sourceFaces.length,
          targetImageFaces: targetFaces.length,
        }
      }

      // Use the first detected face from each image
      const sourceFace = sourceFaces[0]
      const targetFace = targetFaces[0]

      // Calculate similarity based on landmarks
      let similarity = 0
      if (sourceFace.landmarks && targetFace.landmarks && sourceFace.landmarks.length > 0) {
        similarity = this.calculateLandmarkSimilarity(sourceFace.landmarks, targetFace.landmarks)
      } else {
        // Fallback: use bounding box similarity
        similarity = this.calculateBoundingBoxSimilarity(sourceFace.boundingBox, targetFace.boundingBox)
      }

      const confidence = Math.min(sourceFace.confidence, targetFace.confidence)
      const match = similarity >= similarityThreshold && confidence >= 0.7

      return {
        match,
        similarity,
        confidence,
        sourceImageFaces: sourceFaces.length,
        targetImageFaces: targetFaces.length,
      }
    } catch (error) {
      console.error('Google Vision face comparison error:', error)
      throw error
    }
  }

  /**
   * Calculate similarity between two sets of landmarks
   */
  private calculateLandmarkSimilarity(
    landmarks1: Array<{ type: string; position: { x: number; y: number } }>,
    landmarks2: Array<{ type: string; position: { x: number; y: number } }>
  ): number {
    if (landmarks1.length === 0 || landmarks2.length === 0) {
      return 0
    }

    let totalDistance = 0
    let count = 0

    for (const l1 of landmarks1) {
      const l2 = landmarks2.find((l) => l.type === l1.type)

      if (l2) {
        const distance = Math.sqrt(
          Math.pow(l1.position.x - l2.position.x, 2) + Math.pow(l1.position.y - l2.position.y, 2)
        )
        totalDistance += distance
        count++
      }
    }

    if (count === 0) return 0

    // Normalize distance (assuming average face size ~200px)
    const avgDistance = totalDistance / count
    const normalizedDistance = Math.min(avgDistance / 200, 1)

    return 1 - normalizedDistance
  }

  /**
   * Calculate similarity between two bounding boxes
   */
  private calculateBoundingBoxSimilarity(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): number {
    const area1 = box1.width * box1.height
    const area2 = box2.width * box2.height

    if (area1 === 0 || area2 === 0) return 0

    const sizeSimilarity = Math.min(area1, area2) / Math.max(area1, area2)

    return sizeSimilarity
  }

  /**
   * Detect text in an image using Google Vision API
   */
  async detectText(imageBytes: Uint8Array): Promise<OcrResult> {
    const imageBase64 = this.uint8ArrayToBase64(imageBytes)

    // Build URL and headers based on authentication method
    let url: string
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      // API key authentication
      url = `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`
    } else if (this.serviceAccountCredentials) {
      // Service account authentication
      url = 'https://vision.googleapis.com/v1/images:annotate'
      const accessToken = await this.getAccessToken()
      headers['Authorization'] = `Bearer ${accessToken}`
    } else {
      throw new Error('Google Vision API key or service account credentials are not configured')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBase64,
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as any

    if (data.responses?.[0]?.error) {
      throw new Error(`Google Vision API error: ${JSON.stringify(data.responses[0].error)}`)
    }

    const fullTextAnnotation = data.responses?.[0]?.fullTextAnnotation
    const textAnnotations = data.responses?.[0]?.textAnnotations || []

    const fullText = fullTextAnnotation?.text || ''
    const detections: TextDetection[] = textAnnotations.slice(1).map((annotation: any) => {
      const vertices = annotation.boundingPoly?.vertices || []
      const minX = Math.min(...vertices.map((v: any) => v.x || 0))
      const minY = Math.min(...vertices.map((v: any) => v.y || 0))
      const maxX = Math.max(...vertices.map((v: any) => v.x || 0))
      const maxY = Math.max(...vertices.map((v: any) => v.y || 0))

      return {
        text: annotation.description || '',
        confidence: annotation.confidence || 0.9,
        boundingBox: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        },
      }
    })

    // Calculate average confidence
    const avgConfidence =
      detections.length > 0
        ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
        : 0.9

    return {
      fullText,
      detections,
      confidence: avgConfidence,
    }
  }
}


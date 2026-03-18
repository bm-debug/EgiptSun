interface GoogleServiceAccountCredentials {
  client_email: string
  private_key: string
  token_uri?: string
}

interface GeminiOptions {
  model?: string
  temperature?: number
  maxOutputTokens?: number
}

let cachedAccessToken: string | null = null
let cachedTokenExpiry: number | null = null

/**
 * Get OAuth2 access token for Google Gemini API using service account JSON.
 */
async function getGeminiAccessTokenFromServiceAccount(
  credentials: GoogleServiceAccountCredentials,
): Promise<string> {
  // Reuse cached token if still valid (with 60s safety margin)
  if (cachedAccessToken && cachedTokenExpiry && Date.now() < cachedTokenExpiry - 60_000) {
    return cachedAccessToken
  }

  const crypto = await import('crypto')

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)

  const claim = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/generative-language',
  }

  const base64UrlEncode = (str: string): string =>
    Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedClaim = base64UrlEncode(JSON.stringify(claim))
  const signatureInput = `${encodedHeader}.${encodedClaim}`

  let privateKey: string = credentials.private_key
  // Normalize private key newlines
  privateKey = privateKey.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').trim()

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signatureInput, 'utf8')
  const signature = sign
    .sign(privateKey)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const jwt = `${signatureInput}.${signature}`

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
    throw new Error(`Failed to get Gemini access token: ${tokenResponse.status} - ${errorText}`)
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string; expires_in: number }
  cachedAccessToken = tokenData.access_token
  cachedTokenExpiry = Date.now() + tokenData.expires_in * 1000

  return cachedAccessToken
}

/**
 * Call Google Gemini API using GOOGLE_SERVICE_ACCOUNT_JSON env var and return text response.
 */
export async function callGeminiWithServiceAccount(
  prompt: string,
  options: GeminiOptions = { model: 'gemini-2.0-flash-lite', temperature: 0.2, maxOutputTokens: 2048 },
): Promise<string> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (!serviceAccountJson || serviceAccountJson.trim() === '') {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set')
  }

  let credentials: GoogleServiceAccountCredentials
  try {
    credentials = JSON.parse(serviceAccountJson) as GoogleServiceAccountCredentials
  } catch (error) {
    throw new Error(
      `Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    )
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON: client_email and private_key are required')
  }

  const accessToken = await getGeminiAccessTokenFromServiceAccount(credentials)

  const model = options.model ?? 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const body: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  }

  if (options.temperature !== undefined || options.maxOutputTokens !== undefined) {
    body.generationConfig = {}
    if (options.temperature !== undefined) {
      body.generationConfig.temperature = options.temperature
    }
    if (options.maxOutputTokens !== undefined) {
      body.generationConfig.maxOutputTokens = options.maxOutputTokens
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as any

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => (typeof part.text === 'string' ? part.text : ''))
      .join('') ?? ''

  if (!text) {
    throw new Error('Gemini API returned empty response')
  }

  return text
}


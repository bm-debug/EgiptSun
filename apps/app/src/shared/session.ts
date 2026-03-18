/**
 * Encrypted session management utilities for Cloudflare Workers
 * Uses Web Crypto API for encryption/decryption
 */
import { UserWithRoles, SessionData, SessionUser } from './types'

const COOKIE_NAME = 'session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds
export const SESSION_COOKIE_MAX_AGE_SECONDS = COOKIE_MAX_AGE

type SameSite = 'Strict' | 'Lax' | 'None'

export type SessionCookieOptions = {
  secure?: boolean
  sameSite?: SameSite
}

export type SessionCreateOptions = SessionCookieOptions & {
  sessionUuid?: string
}

export function isSecureRequest(request: Request): boolean {
  const xfProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (xfProto) return xfProto.toLowerCase() === 'https'

  const cfVisitor = request.headers.get('cf-visitor')
  if (cfVisitor) {
    try {
      const parsed = JSON.parse(cfVisitor) as { scheme?: string }
      if (parsed?.scheme) return parsed.scheme === 'https'
    } catch {
      // ignore
    }
  }

  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return false
  }
}

function buildSessionCookie(
  value: string,
  maxAge: number,
  options?: SessionCookieOptions
): string {
  const secure =
    options?.secure ??
    // Fallback: in production prefer Secure cookies (most deployments are HTTPS)
    (process.env.NODE_ENV === 'production')
  const sameSite: SameSite = options?.sameSite ?? 'Lax'

  const parts = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    ...(secure ? ['Secure'] : []),
    `SameSite=${sameSite}`,
    `Max-Age=${maxAge}`,
  ]

  return parts.join('; ')
}

/**
 * Derives encryption key from AUTH_SECRET
 */
async function getEncryptionKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const secretData = encoder.encode(secret)
  
  // Import the secret as a key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    secretData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive a key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('altrp-session-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts session data
 */
async function encrypt(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await getEncryptionKey(secret)
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  // Encrypt data
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encryptedData), iv.length)
  
  // Convert to base64url
  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Decrypts session data
 */
async function decrypt(encrypted: string, secret: string): Promise<string | null> {
  try {
    const decoder = new TextDecoder()
    const key = await getEncryptionKey(secret)
    
    // Convert from base64url
    const base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/')
    const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Decryption failed:', error)
    return null
  }
}

/**
 * Creates an encrypted session cookie
 */
export async function createSession(
  user: SessionUser,
  secret: string,
  options?: SessionCreateOptions
): Promise<string> {
  const sessionUuid = options?.sessionUuid ?? crypto.randomUUID()
  const sessionData: SessionData = {
    user,
    expiresAt: Date.now() + COOKIE_MAX_AGE * 1000,
    sessionUuid,
  }
  
  const encrypted = await encrypt(JSON.stringify(sessionData), secret)
  
  return buildSessionCookie(encrypted, COOKIE_MAX_AGE, options)
}

/**
 * Retrieves and validates session from cookie
 */
export async function getSession(request: Request, secret: string): Promise<SessionUser | null> {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return null
  
  // Parse cookies
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...v] = c.trim().split('=')
      return [key, v.join('=')]
    })
  )
  
  const sessionCookie = cookies[COOKIE_NAME]
  if (!sessionCookie) return null
  
  // Decrypt session
  const decrypted = await decrypt(sessionCookie, secret)
  if (!decrypted) return null
  
  try {
    const sessionData: SessionData = JSON.parse(decrypted)
    
    // Check if expired
    if (sessionData.expiresAt < Date.now()) {
      return null
    }
    
    return {
      ...sessionData.user,
      sessionUuid: sessionData.sessionUuid,
    }
  } catch (error) {
    console.error('Failed to parse session:', error)
    return null
  }
}

/**
 * Retrieves and validates session from cookie for server components
 * Uses cookies() from next/headers instead of Request headers
 * 
 * @param secret - AUTH_SECRET for decryption
 * @returns SessionUser if valid session exists, null otherwise
 */
export async function getSessionFromCookies(secret?: string): Promise<SessionUser | null> {
  try {
    if (!secret) {
      secret = process.env.AUTH_SECRET
      if (!secret) {
        throw new Error('AUTH_SECRET is not set')
      }
    }
    // Dynamic import to avoid issues if this function is called outside Next.js context
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    
    const sessionCookie = cookieStore.get(COOKIE_NAME)
    if (!sessionCookie?.value) return null
    
    // Decrypt session
    const decrypted = await decrypt(sessionCookie.value, secret)
    if (!decrypted) return null
    
    try {
      const sessionData: SessionData = JSON.parse(decrypted)
      
      // Check if expired
      if (sessionData.expiresAt < Date.now()) {
        return null
      }
      
      return {
        ...sessionData.user,
        sessionUuid: sessionData.sessionUuid,
      }
    } catch (error) {
      console.error('Failed to parse session:', error)
      return null
    }
  } catch (error) {
    // If cookies() is not available (e.g., called outside Next.js context)
    console.error('Failed to get cookies:', error)
    return null
  }
}

/**
 * Clears the session cookie
 */
export function clearSession(options?: SessionCookieOptions): string {
  return buildSessionCookie('', 0, options)
}

/**
 * Checks if user has admin role
 */
export function isAdmin(user: UserWithRoles | null): boolean {
  return user?.roles.some(role => role.name === 'Administrator') || false
}

/**
 * Creates a JSON response with session cookie
 */
export function jsonWithSession(data: unknown, sessionCookie: string, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookie,
    },
  })
}

/**
 * Creates an unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Creates a forbidden response
 */
export function forbiddenResponse(message = 'Forbidden: Admin access required'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}


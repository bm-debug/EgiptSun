import type { Env } from '@/shared/types'
import type { altrpUser, altrpUserData } from '@/shared/types/altrp'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { sendEmail } from './email.service'

const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60 // 1 hour
export const PASSWORD_RESET_RESEND_COOLDOWN_MS = 1000 * 60 // 1 minute

type PasswordResetMetadata = {
  tokenHash?: string
  expiresAt?: string
  lastSentAt?: string
}

const textEncoder = new TextEncoder()

const hashToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(token))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const parseUserData = (user: altrpUser): altrpUserData => {
  if (!user.dataIn) return {}

  if (typeof user.dataIn === 'string') {
    try {
      return JSON.parse(user.dataIn) as altrpUserData
    } catch {
      return {}
    }
  }

  return user.dataIn as altrpUserData
}

const buildBaseUrl = (env: Env, request?: Request): string => {
  if (env.PUBLIC_SITE_URL) return env.PUBLIC_SITE_URL
  if (request) return new URL(request.url).origin
  return 'https://altrp.local'
}

const buildResetLink = (baseUrl: string, email: string, token: string): string => {
  const url = new URL('/reset-password', baseUrl)
  url.searchParams.set('email', email)
  url.searchParams.set('token', token)
  return url.toString()
}

const getNextAttemptAt = (metadata?: PasswordResetMetadata): string | null => {
  if (!metadata?.lastSentAt) return null
  return new Date(new Date(metadata.lastSentAt).getTime() + PASSWORD_RESET_RESEND_COOLDOWN_MS).toISOString()
}

const ensureCooldown = (metadata?: PasswordResetMetadata) => {
  if (!metadata?.lastSentAt) return
  const lastSent = new Date(metadata.lastSentAt).getTime()
  if (Date.now() - lastSent < PASSWORD_RESET_RESEND_COOLDOWN_MS) {
    const nextAttemptAt = new Date(lastSent + PASSWORD_RESET_RESEND_COOLDOWN_MS).toISOString()
    const err = new Error('Password reset email was sent recently')
    ;(err as any).code = 'RESEND_TOO_SOON'
    ;(err as any).nextAttemptAt = nextAttemptAt
    throw err
  }
}

const buildResetEmailHtml = (resetLink: string, locale: string): string => {
  const localeKey = locale === 'ru' || locale === 'rs' ? locale : 'en'
  
  if (localeKey === 'ru') {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:32px 32px 16px 32px;border-bottom:1px solid #e5e7eb;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#111827;">Altrp</div>
              <div style="font-size:13px;color:#6b7280;margin-top:6px;">Сброс пароля</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                Мы получили запрос на сброс вашего пароля.
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#374151;">
                Нажмите кнопку ниже, чтобы установить новый пароль:
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                  Сбросить пароль
                </a>
              </div>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;word-break:break-all;">
                Если кнопка не работает, откройте ссылку:
                <br/>
                <a href="${resetLink}" style="color:#2563eb;text-decoration:underline;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #e5e7eb;text-align:center;background-color:#f9fafb;border-bottom-left-radius:12px;border-bottom-right-radius:12px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Если вы не запрашивали сброс пароля, вы можете проигнорировать это письмо.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
  }
  
  if (localeKey === 'rs') {
    return `
<!DOCTYPE html>
<html lang="sr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:32px 32px 16px 32px;border-bottom:1px solid #e5e7eb;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#111827;">Altrp</div>
              <div style="font-size:13px;color:#6b7280;margin-top:6px;">Resetovanje lozinke</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                Primili smo zahtev za resetovanje vaše lozinke.
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#374151;">
                Kliknite dugme ispod da postavite novu lozinku:
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                  Resetuj lozinku
                </a>
              </div>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;word-break:break-all;">
                Ako dugme ne radi, otvorite link:
                <br/>
                <a href="${resetLink}" style="color:#2563eb;text-decoration:underline;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #e5e7eb;text-align:center;background-color:#f9fafb;border-bottom-left-radius:12px;border-bottom-right-radius:12px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Ako niste tražili resetovanje lozinke, možete ignorisati ovu poruku.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
  }
  
  // Default to English
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:32px 32px 16px 32px;border-bottom:1px solid #e5e7eb;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#111827;">Altrp</div>
              <div style="font-size:13px;color:#6b7280;margin-top:6px;">Password reset</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                We received a request to reset your password.
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#374151;">
                Click the button below to set a new password:
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                  Reset password
                </a>
              </div>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;word-break:break-all;">
                If the button does not work, open this link:
                <br/>
                <a href="${resetLink}" style="color:#2563eb;text-decoration:underline;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #e5e7eb;text-align:center;background-color:#f9fafb;border-bottom-left-radius:12px;border-bottom-right-radius:12px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                If you did not request a password reset, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export const sendPasswordResetEmail = async (
  env: Env,
  user: altrpUser,
  options: { request?: Request; force?: boolean; locale?: string } = {},
): Promise<{ resendAvailableAt?: string }> => {
  const usersRepository = UsersRepository.getInstance()
  const dataIn = parseUserData(user)
  const existing = (dataIn as any).passwordReset as PasswordResetMetadata | undefined

  if (!options.force) {
    ensureCooldown(existing)
  }

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const hashedToken = await hashToken(token)

  const nextDataIn: altrpUserData = {
    ...dataIn,
    passwordReset: {
      tokenHash: hashedToken,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS).toISOString(),
      lastSentAt: new Date().toISOString(),
    },
  }

  await usersRepository.update(user.uuid, { dataIn: nextDataIn })

  const baseUrl = buildBaseUrl(env, options.request)
  const resetLink = buildResetLink(baseUrl, user.email, token)
  const locale = options.locale === 'ru' || options.locale === 'rs' ? options.locale : 'en'
  
  const subject = locale === 'ru' ? 'Сброс пароля' : locale === 'rs' ? 'Resetovanje lozinke' : 'Password reset'
  const text = locale === 'ru' 
    ? `Откройте ссылку, чтобы сбросить пароль: ${resetLink}`
    : locale === 'rs'
    ? `Otvorite link da resetujete lozinku: ${resetLink}`
    : `Open this link to reset your password: ${resetLink}`

  await sendEmail(env, {
    to: user.email,
    subject,
    html: buildResetEmailHtml(resetLink, locale),
    text,
  })

  return { resendAvailableAt: getNextAttemptAt((nextDataIn as any).passwordReset) || undefined }
}

export const verifyPasswordResetToken = async (
  user: altrpUser,
  token: string,
): Promise<void> => {
  const dataIn = parseUserData(user)
  const metadata = (dataIn as any).passwordReset as PasswordResetMetadata | undefined

  if (!metadata?.tokenHash || !metadata.expiresAt) {
    const err = new Error('Reset token not found')
    ;(err as any).code = 'INVALID_TOKEN'
    throw err
  }

  if (new Date(metadata.expiresAt).getTime() < Date.now()) {
    const err = new Error('Reset token expired')
    ;(err as any).code = 'INVALID_TOKEN'
    throw err
  }

  const hashedToken = await hashToken(token)
  if (hashedToken !== metadata.tokenHash) {
    const err = new Error('Reset token is invalid')
    ;(err as any).code = 'INVALID_TOKEN'
    throw err
  }
}



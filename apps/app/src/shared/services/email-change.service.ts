import type { Env } from '@/shared/types'
import type { altrpUser, altrpUserData } from '@/shared/types/altrp'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { sendEmail } from './email.service'

const EMAIL_CHANGE_TOKEN_TTL_MS = 1000 * 60 * 60 // 1 hour
export const EMAIL_CHANGE_RESEND_COOLDOWN_MS = 1000 * 60 // 1 minute

type EmailChangeMetadata = {
  tokenHash?: string
  expiresAt?: string
  lastSentAt?: string
  newEmail?: string
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

const buildConfirmLink = (baseUrl: string, userUuid: string, token: string): string => {
  const url = new URL('/confirm-email-change', baseUrl)
  url.searchParams.set('u', userUuid)
  url.searchParams.set('token', token)
  return url.toString()
}

const getNextAttemptAt = (metadata?: EmailChangeMetadata): string | null => {
  if (!metadata?.lastSentAt) return null
  return new Date(new Date(metadata.lastSentAt).getTime() + EMAIL_CHANGE_RESEND_COOLDOWN_MS).toISOString()
}

const ensureCooldown = (metadata?: EmailChangeMetadata) => {
  if (!metadata?.lastSentAt) return
  const lastSent = new Date(metadata.lastSentAt).getTime()
  if (Date.now() - lastSent < EMAIL_CHANGE_RESEND_COOLDOWN_MS) {
    const err = new Error('Email change email was sent recently')
    ;(err as any).code = 'RESEND_TOO_SOON'
    ;(err as any).nextAttemptAt = new Date(lastSent + EMAIL_CHANGE_RESEND_COOLDOWN_MS).toISOString()
    throw err
  }
}

const buildEmailChangeHtml = (confirmLink: string, locale: string): string => {
  if (locale === 'ru') {
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
              <div style="font-size:13px;color:#6b7280;margin-top:6px;">Подтверждение смены email</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                Мы получили запрос на смену email для вашего аккаунта.
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#374151;">
                Нажмите кнопку ниже, чтобы подтвердить смену:
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${confirmLink}" style="display:inline-block;padding:12px 20px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                  Подтвердить смену email
                </a>
              </div>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;word-break:break-all;">
                Если кнопка не работает, откройте ссылку:
                <br/>
                <a href="${confirmLink}" style="color:#2563eb;text-decoration:underline;">${confirmLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #e5e7eb;text-align:center;background-color:#f9fafb;border-bottom-left-radius:12px;border-bottom-right-radius:12px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Если вы не запрашивали смену email, просто проигнорируйте это письмо.
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

  if (locale === 'rs') {
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
              <div style="font-size:13px;color:#6b7280;margin-top:6px;">Potvrda promene imejla</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                Primili smo zahtev za promenu imejla na vašem nalogu.
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#374151;">
                Kliknite dugme ispod da potvrdite promenu:
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${confirmLink}" style="display:inline-block;padding:12px 20px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                  Potvrdi promenu imejla
                </a>
              </div>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;word-break:break-all;">
                Ako dugme ne radi, otvorite link:
                <br/>
                <a href="${confirmLink}" style="color:#2563eb;text-decoration:underline;">${confirmLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #e5e7eb;text-align:center;background-color:#f9fafb;border-bottom-left-radius:12px;border-bottom-right-radius:12px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Ako niste tražili ovu promenu, možete ignorisati ovu poruku.
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
              <div style="font-size:13px;color:#6b7280;margin-top:6px;">Confirm email change</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                We received a request to change the email address for your account.
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#374151;">
                Click the button below to confirm the change:
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${confirmLink}" style="display:inline-block;padding:12px 20px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                  Confirm email change
                </a>
              </div>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;word-break:break-all;">
                If the button does not work, open this link:
                <br/>
                <a href="${confirmLink}" style="color:#2563eb;text-decoration:underline;">${confirmLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #e5e7eb;text-align:center;background-color:#f9fafb;border-bottom-left-radius:12px;border-bottom-right-radius:12px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                If you did not request this change, you can ignore this email.
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

export const requestEmailChange = async (
  env: Env,
  user: altrpUser,
  newEmail: string,
  options: { request?: Request; force?: boolean; locale?: string } = {},
): Promise<{ resendAvailableAt?: string }> => {
  const usersRepository = UsersRepository.getInstance()
  const dataIn = parseUserData(user)
  const existing = (dataIn as any).emailChange as EmailChangeMetadata | undefined

  if (!options.force) {
    ensureCooldown(existing)
  }

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const hashedToken = await hashToken(token)

  const nextDataIn: altrpUserData = {
    ...dataIn,
    emailChange: {
      tokenHash: hashedToken,
      expiresAt: new Date(Date.now() + EMAIL_CHANGE_TOKEN_TTL_MS).toISOString(),
      lastSentAt: new Date().toISOString(),
      newEmail,
    },
  }

  await usersRepository.update(user.uuid, { dataIn: nextDataIn })

  const baseUrl = buildBaseUrl(env, options.request)
  const confirmLink = buildConfirmLink(baseUrl, user.uuid, token)
  const locale = options.locale === 'ru' || options.locale === 'rs' ? options.locale : 'en'
  const subject =
    locale === 'ru' ? 'Подтверждение смены email' : locale === 'rs' ? 'Potvrda promene imejla' : 'Confirm email change'

  await sendEmail(env, {
    to: newEmail,
    subject,
    html: buildEmailChangeHtml(confirmLink, locale),
    text:
      locale === 'ru'
        ? `Откройте ссылку, чтобы подтвердить смену email: ${confirmLink}`
        : locale === 'rs'
        ? `Otvorite link da potvrdite promenu imejla: ${confirmLink}`
        : `Open this link to confirm email change: ${confirmLink}`,
  })

  return { resendAvailableAt: getNextAttemptAt((nextDataIn as any).emailChange) || undefined }
}

export const verifyEmailChangeToken = async (
  user: altrpUser,
  token: string,
): Promise<{ newEmail: string }> => {
  const dataIn = parseUserData(user)
  const metadata = (dataIn as any).emailChange as EmailChangeMetadata | undefined

  if (!metadata?.tokenHash || !metadata.expiresAt || !metadata.newEmail) {
    const err = new Error('Email change token not found')
    ;(err as any).code = 'INVALID_TOKEN'
    throw err
  }

  if (new Date(metadata.expiresAt).getTime() < Date.now()) {
    const err = new Error('Email change token expired')
    ;(err as any).code = 'INVALID_TOKEN'
    throw err
  }

  const hashedToken = await hashToken(token)
  if (hashedToken !== metadata.tokenHash) {
    const err = new Error('Email change token is invalid')
    ;(err as any).code = 'INVALID_TOKEN'
    throw err
  }

  return { newEmail: metadata.newEmail }
}



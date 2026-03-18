import type { Env } from '@/shared/types'
import type { altrpUser, altrpUserData } from '@/shared/types/altrp'
import { UsersRepository } from '@/shared/repositories/users.repository'
import { sendEmail } from './email.service'
import { isPostgres } from '@/shared/utils/db'

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours
export const EMAIL_RESEND_COOLDOWN_MS = 1000 * 60 // 1 minute

export class EmailVerificationError extends Error {
  public readonly code: 'ALREADY_VERIFIED' | 'RESEND_TOO_SOON' | 'INVALID_TOKEN'
  public readonly nextAttemptAt?: string

  constructor(
    code: EmailVerificationError['code'],
    message: string,
    options?: { nextAttemptAt?: string },
  ) {
    super(message)
    this.code = code
    this.nextAttemptAt = options?.nextAttemptAt
  }
}

type VerificationMetadata = NonNullable<altrpUserData['emailVerification']>

const textEncoder = new TextEncoder()

const hashToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(token))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const parseUserData = (user: altrpUser): altrpUserData => {
  if (!user.dataIn) {
    return {}
  }

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
  if (env.PUBLIC_SITE_URL) {
    return env.PUBLIC_SITE_URL
  }

  if (request) {
    const url = new URL(request.url)
    return url.origin
  }

  return 'https://altrp.local'
}

const buildVerificationLink = (baseUrl: string, email: string, token: string): string => {
  const url = new URL('/verify-email', baseUrl)
  url.searchParams.set('email', email)
  url.searchParams.set('token', token)
  return url.toString()
}

const getNextAttemptAt = (metadata?: VerificationMetadata): string | null => {
  if (!metadata?.lastSentAt) {
    return null
  }
  return new Date(new Date(metadata.lastSentAt).getTime() + EMAIL_RESEND_COOLDOWN_MS).toISOString()
}

const ensureCooldown = (metadata?: VerificationMetadata) => {
  if (!metadata?.lastSentAt) {
    return
  }

  const lastSent = new Date(metadata.lastSentAt).getTime()
  if (Date.now() - lastSent < EMAIL_RESEND_COOLDOWN_MS) {
    throw new EmailVerificationError('RESEND_TOO_SOON', 'Verification email was sent recently', {
      nextAttemptAt: new Date(lastSent + EMAIL_RESEND_COOLDOWN_MS).toISOString(),
    })
  }
}

const buildVerificationEmailHtml = (verificationLink: string, locale: string): string => {
  const localeKey = locale === 'ru' || locale === 'rs' ? locale : 'en'
  
  if (localeKey === 'ru') {
    return `
<!DOCTYPE html>
<html lang="ru" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style type="text/css">
    table {border-collapse: collapse; border-spacing: 0; margin: 0;}
    div, td {padding: 0;}
    div {margin: 0 !important;}
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .email-Container { width: 100% !important; }
      .email-content { padding: 20px !important; }
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <div style="font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 8px;">Altrp</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Платформа финансовых решений</div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.4;">Здравствуйте!</h1>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Вы зарегистрировались в платформе <strong>altrp</strong>. Для продолжения работы, пожалуйста, подтвердите адрес электронной почты.
              </p>
              
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Нажмите на кнопку ниже, чтобы подтвердить ваш email-адрес:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 32px 0;">
                    <a href="${verificationLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; min-width: 200px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Подтвердить email</a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link Section -->
              <div style="padding: 24px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #e5e7eb;">
                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">Если кнопка не работает</p>
                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                  Скопируйте ссылку ниже и вставьте её в адресную строку браузера:
                </p>
                <p style="margin: 0; word-break: break-all;">
                  <a href="${verificationLink}" style="font-size: 13px; color: #2563eb; text-decoration: underline; line-height: 1.6;">${verificationLink}</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                Это письмо отправлено автоматически, пожалуйста, не отвечайте на него.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                Если вы не регистрировались в Altrp, просто проигнорируйте это письмо.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Spacer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px 20px 0 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Altrp. Все права защищены.
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
<html lang="sr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style type="text/css">
    table {border-collapse: collapse; border-spacing: 0; margin: 0;}
    div, td {padding: 0;}
    div {margin: 0 !important;}
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .email-Container { width: 100% !important; }
      .email-content { padding: 20px !important; }
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <div style="font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 8px;">Altrp</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Platforma finansijskih rešenja</div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.4;">Zdravo!</h1>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Registrovali ste se na platformi <strong>altrp</strong>. Da biste nastavili rad, molimo potvrdite adresu elektronske pošte.
              </p>
              
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Kliknite na dugme ispod da biste potvrdili vašu email adresu:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 32px 0;">
                    <a href="${verificationLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; min-width: 200px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Potvrdi email</a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link Section -->
              <div style="padding: 24px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #e5e7eb;">
                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">Ako dugme ne radi</p>
                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                  Kopirajte link ispod i nalepite ga u adresnu traku pregledača:
                </p>
                <p style="margin: 0; word-break: break-all;">
                  <a href="${verificationLink}" style="font-size: 13px; color: #2563eb; text-decoration: underline; line-height: 1.6;">${verificationLink}</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                Ova poruka je automatski poslata, molimo ne odgovarajte na nju.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                Ako se niste registrovali na Altrp, jednostavno ignorišite ovu poruku.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Spacer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px 20px 0 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Altrp. Sva prava zadržana.
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
  
  // English version (default)
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style type="text/css">
    table {border-collapse: collapse; border-spacing: 0; margin: 0;}
    div, td {padding: 0;}
    div {margin: 0 !important;}
  </style>
  <![endif]-->
  <!--[if !mso]><!-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .email-Container { width: 100% !important; }
      .email-content { padding: 20px !important; }
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <div style="font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 8px;">Altrp</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Financial Solutions Platform</div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.4;">Hello!</h1>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                You have registered on the <strong>altrp</strong> platform. To continue, please confirm your email address.
              </p>
              
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Click the button below to confirm your email address:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 32px 0;">
                    <a href="${verificationLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; min-width: 200px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Confirm email</a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link Section -->
              <div style="padding: 24px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #e5e7eb;">
                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">If the button doesn't work</p>
                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                  Copy the link below and paste it into your browser's address bar:
                </p>
                <p style="margin: 0; word-break: break-all;">
                  <a href="${verificationLink}" style="font-size: 13px; color: #2563eb; text-decoration: underline; line-height: 1.6;">${verificationLink}</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                This email was sent automatically, please do not reply to it.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                If you did not register on Altrp, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Spacer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px 20px 0 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Altrp. All rights reserved.
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

export const sendVerificationEmail = async (
  env: Env,
  user: altrpUser,
  options: { request?: Request; force?: boolean; locale?: string } = {},
): Promise<void> => {
  if (user.emailVerifiedAt) {
    throw new EmailVerificationError('ALREADY_VERIFIED', 'Email already verified')
  }

  const usersRepository = UsersRepository.getInstance()
  const dataIn = parseUserData(user)
  if (!options.force) {
    ensureCooldown(dataIn.emailVerification)
  }

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const hashedToken = await hashToken(token)
  const updatedDataIn: altrpUserData = {
    ...dataIn,
    emailVerification: {
      tokenHash: hashedToken,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString(),
      lastSentAt: new Date().toISOString(),
    },
  }

  await usersRepository.update(user.uuid, {
    dataIn: updatedDataIn,
  })

  const baseUrl = buildBaseUrl(env, options.request)
  const verificationLink = buildVerificationLink(baseUrl, user.email, token)
  const locale = options.locale === 'ru' || options.locale === 'rs' ? options.locale : 'en'
  
  const subject = locale === 'ru' 
    ? 'Подтверждение адреса электронной почты'
    : locale === 'rs'
    ? 'Potvrda adrese elektronske pošte'
    : 'Email address confirmation'
  const text = locale === 'ru'
    ? `Здравствуйте! Вы зарегистрировались в платформе Altrp. Для продолжения, пожалуйста, подтвердите адрес электронной почты, перейдя по ссылке: ${verificationLink}`
    : locale === 'rs'
    ? `Zdravo! Registrovali ste se na platformi Altrp. Da biste nastavili, molimo potvrdite adresu elektronske pošte, prelazeći na link: ${verificationLink}`
    : `Hello! You have registered on the Altrp platform. To continue, please confirm your email address by following the link: ${verificationLink}`

  await sendEmail(env, {
    to: user.email,
    subject,
    html: buildVerificationEmailHtml(verificationLink, locale),
    text,
  })
}

export const verifyEmailToken = async (
  env: Env,
  user: altrpUser,
  token: string,
): Promise<altrpUser> => {
  if (user.emailVerifiedAt) {
    throw new EmailVerificationError('ALREADY_VERIFIED', 'Email already verified')
  }

  const usersRepository = UsersRepository.getInstance()
  const dataIn = parseUserData(user)
  const metadata = dataIn.emailVerification

  if (!metadata?.tokenHash || !metadata.expiresAt) {
    throw new EmailVerificationError('INVALID_TOKEN', 'Verification token not found')
  }

  if (new Date(metadata.expiresAt).getTime() < Date.now()) {
    throw new EmailVerificationError('INVALID_TOKEN', 'Verification token expired')
  }

  const hashedToken = await hashToken(token)
  if (hashedToken !== metadata.tokenHash) {
    throw new EmailVerificationError('INVALID_TOKEN', 'Verification token is invalid')
  }

  const updatedDataIn = {
    ...dataIn,
  }
  delete updatedDataIn.emailVerification

  const updatedUser = await usersRepository.update(user.uuid, {
    emailVerifiedAt: new Date(),
    dataIn: updatedDataIn,
  })

  return updatedUser
}

export const getVerificationMetadata = (user: altrpUser): VerificationMetadata | undefined => {
  const dataIn = parseUserData(user)
  return dataIn.emailVerification
}

export const getNextResendAvailableAt = (user: altrpUser): string | null => {
  return getNextAttemptAt(getVerificationMetadata(user))
}



import type { Env } from '@/shared/types'

type EmailPayload = {
  to: string
  subject: string
  html: string
  text?: string
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second
const RATE_LIMIT_DELAY = 2000 // 2 seconds (half of the 2 requests per second limit)

const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, '').trim()

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

async function sendEmailWithRetry(
  env: Env,
  payload: EmailPayload,
  retryCount = 0
): Promise<void> {
  const from = env.EMAIL_FROM || env.MAIL_FROM
  const apiKey = env.RESEND_API_KEY || env.SENDGRID_API_KEY

  if (!apiKey || !from) {
    console.info('[email-preview]', {
      to: payload.to,
      subject: payload.subject,
      text: payload.text ?? stripHtml(payload.html),
      html: payload.html,
    })
    return
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text ?? stripHtml(payload.html),
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      let errorData: any = {}
      
      try {
        errorData = JSON.parse(errorBody)
      } catch {
        // Если не JSON, используем текст как есть
      }

      // Обработка rate limit (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        const delay = retryAfter 
          ? parseInt(retryAfter, 10) * 1000 
          : RATE_LIMIT_DELAY * (retryCount + 1)

        if (retryCount < MAX_RETRIES) {
          console.warn(
            `Rate limit exceeded. Retrying after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
          )
          await sleep(delay)
          return sendEmailWithRetry(env, payload, retryCount + 1)
        } else {
          console.error('Email provider rate limit exceeded after max retries', errorBody)
          throw new Error(
            `Rate limit exceeded: ${errorData.message || 'Too many requests'}. Max retries reached.`
          )
        }
      }

      // Для других ошибок
      console.error('Email provider responded with error', errorBody)
      throw new Error(
        `Failed to send email: ${response.status} - ${errorData.message || errorBody}`
      )
    }

    return
  } catch (error) {
    // Если это не rate limit ошибка и есть попытки, пробуем еще раз
    if (retryCount < MAX_RETRIES && !(error instanceof Error && error.message.includes('Rate limit'))) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount) // Exponential backoff
      console.warn(
        `Email sending failed, retrying after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`,
        error
      )
      await sleep(delay)
      return sendEmailWithRetry(env, payload, retryCount + 1)
    }

    console.error('Email sending failed, falling back to console output', error)
    // Fallback: выводим в консоль для разработки
    console.info('[email-preview]', {
      to: payload.to,
      subject: payload.subject,
      text: payload.text ?? stripHtml(payload.html),
      html: payload.html,
    })
  }
}

export async function sendEmail(env: Env, payload: EmailPayload): Promise<void> {
  return sendEmailWithRetry(env, payload)
}



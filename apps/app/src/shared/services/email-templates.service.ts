/**
 * Email templates service
 * Provides HTML templates for various email notifications
 */

export interface PaymentReminderEmailData {
  clientName: string
  financeFaid: string
  dealAid: string
  amount: number
  paymentDate: string
  daysText: string // "сегодня", "завтра", "через N дней"
}

export interface PaymentOverdueEmailData {
  clientName: string
  financeFaid: string
  dealAid: string
  amount: number
  paymentDate: string
  overdueDays: number
}

export interface AdminNewLoanApplicationEmailData {
  dealAid: string
  clientName: string
  productPrice: number
  termText: string
  productName?: string
}

const buildEmailBase = (content: string): string => {
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
          ${content}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                Это письмо отправлено автоматически, пожалуйста, не отвечайте на него.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                Если у вас возникли вопросы, обратитесь в службу поддержки.
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

/**
 * Build HTML email for payment reminder
 */
export function buildPaymentReminderEmailHtml(data: PaymentReminderEmailData): string {
  const { clientName, financeFaid, dealAid, amount, paymentDate, daysText } = data
  const formattedAmount = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const formattedDate = new Date(paymentDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const content = `
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
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.4;">Напоминание о платеже</h1>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Здравствуйте, <strong>${clientName}</strong>!
              </p>
              
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Напоминаем вам о предстоящем платеже по сделке <strong>${dealAid}</strong>.
              </p>
              
              <!-- Payment Info Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 500;">Сумма к оплате</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 20px;">
                          <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff; line-height: 1.2;">${formattedAmount} ₽</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding-bottom: 8px;">
                                <p style="margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.8);">Дата платежа</p>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${formattedDate}</p>
                                <p style="margin: 4px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">${daysText}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Payment Details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #2563eb;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #374151;">Детали платежа</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                    <td style="width: 140px;">
                                      <p style="margin: 0; font-size: 14px; color: #6b7280;">Номер платежа:</p>
                                    </td>
                                    <td>
                                      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${financeFaid}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                    <td style="width: 140px;">
                                      <p style="margin: 0; font-size: 14px; color: #6b7280;">Номер сделки:</p>
                                    </td>
                                    <td>
                                      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${dealAid}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <div style="padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 32px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #92400e;">
                  <strong>Важно:</strong> Пожалуйста, убедитесь, что у вас достаточно средств для оплаты в указанную дату.
                </p>
              </div>
              
              <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                С уважением,<br><strong>Команда Altrp</strong>
              </p>
            </td>
          </tr>
  `

  return buildEmailBase(content)
}

/**
 * Build HTML email for admins about new loan application
 */
export function buildAdminNewLoanApplicationEmailHtml(data: AdminNewLoanApplicationEmailData): string {
  const { dealAid, clientName, productPrice, termText, productName } = data
  const formattedAmount = productPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

  const content = `
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <div style="font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 4px;">Новая заявка на рассрочку</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Уведомление для администратора</div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                В системе создана новая заявка на рассрочку. Краткая информация приведена ниже.
              </p>

              <!-- Deal Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px; background-color: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280;">Номер заявки</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${dealAid}</p>
                  </td>
                </tr>
              </table>

              <!-- Details Table -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
                <tbody>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; width: 40%;">Клиент</td>
                    <td style="padding: 6px 0; color: #111827; font-weight: 500;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Сумма рассрочки</td>
                    <td style="padding: 6px 0; color: #111827; font-weight: 500;">${formattedAmount} ₽</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Срок</td>
                    <td style="padding: 6px 0; color: #111827; font-weight: 500;">${termText}</td>
                  </tr>
                  ${
                    productName
                      ? `<tr>
                          <td style="padding: 6px 0; color: #6b7280;">Товар / услуга</td>
                          <td style="padding: 6px 0; color: #111827;">${productName}</td>
                        </tr>`
                      : ''
                  }
                </tbody>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: #6b7280;">
                Для просмотра полной анкеты и обработки заявки перейдите в административную панель.
              </p>
            </td>
          </tr>
  `

  return buildEmailBase(content)
}

/**
 * Build HTML email for overdue payment
 */
export function buildPaymentOverdueEmailHtml(data: PaymentOverdueEmailData): string {
  const { clientName, financeFaid, dealAid, amount, paymentDate, overdueDays } = data
  const formattedAmount = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const formattedDate = new Date(paymentDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const overdueDaysText = overdueDays === 1
    ? 'день'
    : overdueDays < 5
    ? 'дня'
    : 'дней'

  const content = `
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);">
              <div style="font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 8px;">Altrp</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Платформа финансовых решений</div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #dc2626; line-height: 1.4;">Просроченный платеж</h1>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Здравствуйте, <strong>${clientName}</strong>!
              </p>
              
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Уведомляем вас о просроченном платеже по сделке <strong>${dealAid}</strong>.
              </p>
              
              <!-- Overdue Alert -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px; background-color: #fee2e2; border-radius: 12px; border-left: 4px solid #dc2626;">
                    <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #991b1b;">⚠️ Платеж просрочен</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: #dc2626;">${overdueDays} ${overdueDaysText}</p>
                  </td>
                </tr>
              </table>
              
              <!-- Payment Info Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 12px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 16px;">
                          <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 500;">Сумма к оплате</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 20px;">
                          <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff; line-height: 1.2;">${formattedAmount} ₽</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding-bottom: 8px;">
                                <p style="margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.8);">Дата платежа</p>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${formattedDate}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Payment Details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #dc2626;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #374151;">Детали платежа</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                    <td style="width: 140px;">
                                      <p style="margin: 0; font-size: 14px; color: #6b7280;">Номер платежа:</p>
                                    </td>
                                    <td>
                                      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${financeFaid}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                    <td style="width: 140px;">
                                      <p style="margin: 0; font-size: 14px; color: #6b7280;">Номер сделки:</p>
                                    </td>
                                    <td>
                                      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${dealAid}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <div style="padding: 20px; background-color: #fee2e2; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 32px;">
                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #991b1b;">Важно</p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #991b1b;">
                  Пожалуйста, произведите оплату в ближайшее время во избежание начисления пеней и дальнейших санкций.
                </p>
              </div>
              
              <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                С уважением,<br><strong>Команда Altrp</strong>
              </p>
            </td>
          </tr>
  `

  return buildEmailBase(content)
}


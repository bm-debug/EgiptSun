import { altrpJournal } from "../types/altrp";
import { DbFilters, DbOrders, DbPagination } from "../types/shared";
import { MeRepository } from "../repositories/me.repository";
import { JOURNAL_ACTION_NAMES } from '../constants/journal-actions'


export const parseQueryParams = (url: URL): { filters: DbFilters; orders: DbOrders; pagination: DbPagination } => {
    const filters: DbFilters = { conditions: [] }
    const orders: DbOrders = { orders: [] }
    const pagination: DbPagination = {}
  
    // Parse pagination
    const page = url.searchParams.get('page')
    const limit = url.searchParams.get('limit')
    if (page) pagination.page = parseInt(page, 10)
    if (limit) pagination.limit = parseInt(limit, 10)
  
    // Parse search filter
    const search = url.searchParams.get('search')
    if (search) {
      filters.conditions?.push({
        field: 'email',
        operator: 'like',
        values: [`%${search}%`],
      })
    }
  
    // Parse isActive filter
    const isActive = url.searchParams.get('isActive')
    if (isActive !== null) {
      filters.conditions?.push({
        field: 'isActive',
        operator: 'eq',
        values: [isActive === 'true'],
      })
    }
  
    // Parse orders (example: ?orderBy=createdAt&orderDirection=desc)
    const orderBy = url.searchParams.get('orderBy')
    const orderDirection = url.searchParams.get('orderDirection') as 'asc' | 'desc' | null
    if (orderBy && orderDirection) {
      orders.orders?.push({
        field: orderBy,
        direction: orderDirection,
      })
    } else {
      // Default order by createdAt desc
      orders.orders?.push({
        field: 'createdAt',
        direction: 'desc',
      })
    }
  
    // Always exclude soft-deleted records
    filters.conditions?.push({
      field: 'deletedAt',
      operator: 'isNull',
      values: [],
    })
  
    return { filters, orders, pagination }
  }

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const parseJournals = async (journals: altrpJournal[], forAdmin: boolean = true): Promise<altrpJournal[]> => {
  // Use shared action names mapping
  const actionNames = JOURNAL_ACTION_NAMES

  const meRepository = MeRepository.getInstance()

  // Process journals with async operations
  const processedJournals = await Promise.all(
    journals.map(async (journal) => {
      let updatedJournal = { ...journal }
      const originalAction = journal.action

      // Transform action to readable name
      if (journal.action && actionNames[journal.action]) {
        updatedJournal = {
          ...updatedJournal,
          action: actionNames[journal.action],
        }
      }

      // Parse details
      const rawDetails =
        typeof journal.details === 'string'
          ? (JSON.parse(journal.details) as Record<string, unknown>)
          : (journal.details as Record<string, unknown> | undefined)

      // For USER_JOURNAL_LOGIN, USER_JOURNAL_LOGOUT, USER_JOURNAL_REGISTRATION, enrich description with user info and roles
      if (originalAction === 'USER_JOURNAL_LOGIN' || originalAction === 'USER_JOURNAL_LOGOUT' || originalAction === 'USER_JOURNAL_REGISTRATION') {
        try {
          const userDetails = rawDetails?.user as
            | {
                uuid?: string
                email?: string
                humanAid?: string | null
              }
            | undefined

          if (userDetails?.uuid) {
            const userWithRoles = await meRepository.findByUuidWithRoles(userDetails.uuid, {
              includeHuman: true,
            })

            if (userWithRoles) {
              const userName = userWithRoles.human?.fullName || userDetails.email || 'Неизвестный пользователь'
              const roles = userWithRoles.roles || []
              const roleNames = roles.length > 0 
                ? roles.map((role) => role.title || role.name).filter(Boolean).join(', ')
                : 'Без ролей'

              const description = `${userName} (${roleNames})`

              // Add description and originalAction to details
              const enrichedDetails = {
                ...rawDetails,
                description,
                originalAction,
              }

              updatedJournal = {
                ...updatedJournal,
                details: enrichedDetails,
              }
            }
          }
        } catch (error) {
          console.error('Failed to enrich journal description:', error)
          // Continue with original journal if enrichment fails
        }
      }

      // For USER_JOURNAL_SUPPORT_CHAT_CREATED, enrich description with chat and user info
      if (originalAction === 'USER_JOURNAL_SUPPORT_CHAT_CREATED' && rawDetails) {
        try {
          const userDetails = rawDetails.user as
            | {
                email?: string
              }
            | undefined

          const chatDetails = rawDetails.chat as
            | {
                title?: string
                statusName?: string
              }
            | undefined

          const userEmail = userDetails?.email || 'неизвестный пользователь'
          const chatTitle = chatDetails?.title || 'чат поддержки'
          const chatStatus = chatDetails?.statusName

          const descriptionParts = [`Создано обращение в чат поддержки "${chatTitle}"`, `для пользователя ${userEmail}`]
          if (chatStatus) {
            descriptionParts.push(`(статус: ${chatStatus})`)
          }

          const description = descriptionParts.join(' ')

          const enrichedDetails = {
            ...rawDetails,
            description,
            originalAction,
          }

          updatedJournal = {
            ...updatedJournal,
            details: enrichedDetails,
          }
        } catch (error) {
          console.error('Failed to enrich support chat creation description:', error)
        }
      }

      // For USER_JOURNAL_WALLET_DEPOSIT, enrich description with transaction info
      if (originalAction === 'USER_JOURNAL_WALLET_DEPOSIT' && rawDetails) {
        try {
          const transaction = rawDetails.transaction as
            | {
                description?: string
                amountRubles?: number
                type?: string
              }
            | undefined

          if (transaction?.description) {
            const enrichedDetails = {
              ...rawDetails,
              description: transaction.description,
              originalAction,
            }

            updatedJournal = {
              ...updatedJournal,
              details: enrichedDetails,
            }
          }
        } catch (error) {
          console.error('Failed to enrich wallet deposit description:', error)
        }
      }

      // For USER_JOURNAL_FINANCE_PAID, enrich description with finance info
      if (originalAction === 'USER_JOURNAL_FINANCE_PAID' && rawDetails) {
        try {
          const finance = rawDetails.finance as
            | {
                faid?: string
                amountRubles?: number
              }
            | undefined

          if (finance) {
            const amountText = finance.amountRubles
              ? formatCurrency(finance.amountRubles)
              : ''
            const description = `Гашение платежа ${finance.faid || ''}${amountText ? ` на сумму ${amountText}` : ''}`

            const enrichedDetails = {
              ...rawDetails,
              description,
              originalAction,
            }

            updatedJournal = {
              ...updatedJournal,
              details: enrichedDetails,
            }
          }
        } catch (error) {
          console.error('Failed to enrich finance paid description:', error)
        }
      }

      // For DEAL_APPROVED, DEAL_STATUS_CHANGE, DEAL_REJECTED, DEAL_CANCELLED
      // Use description from details if already set by createLoanApplicationSnapshot
      if ((originalAction === 'DEAL_APPROVED' || originalAction === 'DEAL_STATUS_CHANGE' || originalAction === 'DEAL_REJECTED' || originalAction === 'DEAL_CANCELLED') && rawDetails) {
        // If description is already in details (set by createLoanApplicationSnapshot), use it
        if (rawDetails.description && typeof rawDetails.description === 'string') {
          const enrichedDetails = {
            ...rawDetails,
            description: rawDetails.description,
            originalAction,
          }

          updatedJournal = {
            ...updatedJournal,
            details: enrichedDetails,
          }
        } else {
          // Fallback: build description from snapshot if not already set
          try {
            if (rawDetails && 'snapshot' in rawDetails) {
              const snapshot = rawDetails.snapshot as {
                dataIn?: unknown
                statusName?: string
              }

              let dataIn = snapshot?.dataIn as
                | {
                    firstName?: string
                    lastName?: string
                    middleName?: string
                    fullName?: string
                    productPrice?: string | number
                    productName?: string
                  }
                | undefined

              if (typeof snapshot?.dataIn === 'string') {
                try {
                  dataIn = JSON.parse(snapshot.dataIn) as typeof dataIn
                } catch {
                  // ignore parse error
                }
              }

              let fullName = ''
              if (dataIn?.fullName) {
                fullName = dataIn.fullName.trim()
              } else if (dataIn?.firstName || dataIn?.lastName || dataIn?.middleName) {
                const nameParts = [
                  dataIn.lastName,
                  dataIn.firstName,
                  dataIn.middleName,
                ].filter(Boolean) as string[]
                fullName = nameParts.join(' ').trim()
              }

              const clientName = fullName || 'клиента'

              let amountText = ''
              if (dataIn?.productPrice !== undefined) {
                const rawPrice = dataIn.productPrice
                const numeric =
                  typeof rawPrice === 'number'
                    ? rawPrice
                    : Number(String(rawPrice).replace(/[^\d.-]/g, ''))
                if (Number.isFinite(numeric) && numeric > 0) {
                  amountText = formatCurrency(numeric)
                }
              }

              const productName = dataIn?.productName?.trim()
              const statusName = snapshot?.statusName || 'новый статус'
              const previousSnapshot = rawDetails.previousSnapshot as { statusName?: string } | null
              const previousStatus = previousSnapshot?.statusName || 'неизвестно'

              let description = ''
              if (originalAction === 'DEAL_APPROVED') {
                description = `Одобрена заявка от ${clientName}${productName ? ` на товар "${productName}"` : ''}${amountText ? ` на сумму ${amountText}` : ''}. Статус изменен с "${previousStatus}" на "APPROVED"`
              } else if (originalAction === 'DEAL_REJECTED' || originalAction === 'DEAL_CANCELLED') {
                const actionText = originalAction === 'DEAL_REJECTED' ? 'Отклонена' : 'Отменена'
                description = `${actionText} заявка от ${clientName}${productName ? ` на товар "${productName}"` : ''}${amountText ? ` на сумму ${amountText}` : ''}. Статус изменен с "${previousStatus}" на "${statusName}"`
              } else {
                description = `Изменен статус заявки от ${clientName}${productName ? ` на товар "${productName}"` : ''}${amountText ? ` на сумму ${amountText}` : ''}. Статус изменен с "${previousStatus}" на "${statusName}"`
              }

              const enrichedDetails = {
                ...rawDetails,
                description,
                originalAction,
              }

              updatedJournal = {
                ...updatedJournal,
                details: enrichedDetails,
              }
            }
          } catch (error) {
            console.error('Failed to enrich deal status description:', error)
          }
        }
      }

      // For LOAN_APPLICATION_SNAPSHOT, use description from details if already set by createLoanApplicationSnapshot
      if (originalAction === 'LOAN_APPLICATION_SNAPSHOT' && rawDetails) {
        // If description is already in details (set by createLoanApplicationSnapshot), use it
        if (rawDetails.description && typeof rawDetails.description === 'string') {
          const enrichedDetails = {
            ...rawDetails,
            description: rawDetails.description,
            originalAction,
          }

          updatedJournal = {
            ...updatedJournal,
            details: enrichedDetails,
          }
        } else if (rawDetails && 'snapshot' in rawDetails) {
          // Fallback: build description from snapshot if not already set
          try {
            const snapshot = rawDetails.snapshot as {
              dataIn?: unknown
            }

          let dataIn = snapshot?.dataIn as
            | {
                firstName?: string
                lastName?: string
                middleName?: string
                fullName?: string
                productPrice?: string | number
                productName?: string
                phoneNumber?: string
              }
            | undefined

          // Parse dataIn if it's a string
          if (typeof snapshot?.dataIn === 'string') {
            try {
              dataIn = JSON.parse(snapshot.dataIn) as typeof dataIn
            } catch {
              // ignore parse error
            }
          }

          // Extract client name
          let fullName = ''
          if (dataIn?.fullName) {
            fullName = dataIn.fullName.trim()
          } else if (dataIn?.firstName || dataIn?.lastName || dataIn?.middleName) {
            const nameParts = [
              dataIn.lastName,
              dataIn.firstName,
              dataIn.middleName,
            ].filter(Boolean) as string[]
            fullName = nameParts.join(' ').trim()
          }

          const clientName = fullName || 'клиента'

          // Extract and format amount
          let amountText = ''
          if (dataIn?.productPrice !== undefined) {
            const rawPrice = dataIn.productPrice
            const numeric =
              typeof rawPrice === 'number'
                ? rawPrice
                : Number(String(rawPrice).replace(/[^\d.-]/g, ''))
            if (Number.isFinite(numeric) && numeric > 0) {
              amountText = formatCurrency(numeric)
            }
          }

          // Extract product name if available
          const productName = dataIn?.productName?.trim()

          // Build description
          let description = `Заявка на рассрочку от ${clientName}`
          if (productName) {
            description += ` на товар "${productName}"`
          }
          if (amountText) {
            description += ` на сумму ${amountText}`
          }

          // Add description and originalAction to details
          const enrichedDetails = {
            ...rawDetails,
            description,
            originalAction,
          }

            updatedJournal = {
              ...updatedJournal,
              details: enrichedDetails,
            }
          } catch (error) {
            console.error('Failed to enrich loan application description:', error)
            // Continue with original journal if enrichment fails
          }
        }
      }

      return updatedJournal
    })
  )

  // For non-admin users, return only minimal data (what's shown in the table)
  if (!forAdmin) {
    return processedJournals.map((journal) => {
      const rawDetails =
        typeof journal.details === 'string'
          ? (JSON.parse(journal.details) as Record<string, unknown>)
          : (journal.details as Record<string, unknown> | undefined)

      // Extract description from details
      let description = ''
      if (rawDetails && 'description' in rawDetails && typeof rawDetails.description === 'string') {
        description = rawDetails.description
      } else {
        // Fallback: use action type or message
        const detailsObj = rawDetails as { message?: string; context?: string } | undefined
        const message = detailsObj?.message || detailsObj?.context || journal.action
        description = message || `${journal.action} #${journal.uuid?.substring(0, 8) || journal.id}`
      }

      // Return only fields needed for the table: type (action), description, and date
      // Include all required fields from schema to satisfy type requirements
      return {
        id: journal.id,
        uuid: journal.uuid,
        action: journal.action,
        details: {
          description,
        },
        user_id: journal.user_id || null,
        xaid: journal.xaid || null,
        createdAt: journal.createdAt,
        updatedAt: journal.updatedAt,
      } as altrpJournal
    })
  }

  return processedJournals
}

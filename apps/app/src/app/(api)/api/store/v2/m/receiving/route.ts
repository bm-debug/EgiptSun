
import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { MeRepository } from '@/shared/repositories/me.repository'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'
import { createDb, type SiteDbPostgres } from '@/shared/repositories/utils' 

const toKopecks = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  const numeric = typeof value === 'string' ? Number(value) : value

  if (typeof numeric !== 'number' || Number.isNaN(numeric)) {
    return undefined
  }

  return Math.round(numeric * 100)
}

/**
 * POST /api/store/v2/s/receiving
 * Creates a new receiving base move
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env, user: sessionUserWithRoles } = context

  try {
    // Parse request body
    const body = await request.json() as {
      title?: string
      transportCost?: number
      date?: string
      ownerEaid?: string
    }

    // Determine owner and location
    let ownerEaid: string
    let locationLaid: string | null = null
    let location: any = undefined

    const meRepository = MeRepository.getInstance()

    if (body.ownerEaid) {
      // Use specified owner
      ownerEaid = body.ownerEaid
      
      // Get employee by eaid to get location
      const employee = await meRepository.findEmployeeByEaid(body.ownerEaid)
      
      if (!employee) {
        return new Response(
          JSON.stringify({ 
            error: `Сотрудник с eaid ${body.ownerEaid} не найден` 
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // Parse employee data_in to get location_laid
      let employeeDataIn: any = {}
      if (employee.dataIn) {
        try {
          employeeDataIn = typeof employee.dataIn === 'string' 
            ? JSON.parse(employee.dataIn) 
            : employee.dataIn
        } catch (e) {
          console.error('Failed to parse employee dataIn:', e)
        }
      }

      locationLaid = employeeDataIn?.location_laid

      if (!locationLaid) {
        return new Response(
          JSON.stringify({ 
            error: `Локация для сотрудника ${body.ownerEaid} не настроена. Обратитесь к администраторам системы.` 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // Get location details if needed
      if (locationLaid) {
        const locationsRepo = await import('@/shared/repositories/locations.repository')
        const LocationsRepository = locationsRepo.LocationsRepository
        const locRepo = LocationsRepository.getInstance()
        const loc = await locRepo.findByLaid(locationLaid)
        if (loc) {
          location = {
            laid: loc.laid,
            fullLaid: loc.fullLaid,
            title: loc.title,
            city: loc.city,
            type: loc.type,
          }
        }
      }
    } else {
      // Fallback to current user
      // We already have the user info from the guard but might need to refresh or ensure correct includes
      const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUserWithRoles.user.id), {
        includeEmployee: true,
        includeLocation: true,
      })

      if (!userWithRoles?.employee?.eaid) {
        return new Response(
          JSON.stringify({ 
            error: 'Информация о сотруднике не найдена. Ваш аккаунт не связан с профилем сотрудника в системе. Обратитесь к администраторам системы для настройки вашего профиля.' 
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      ownerEaid = userWithRoles.employee.eaid

      // Parse employee data_in to get location_laid
      let employeeDataIn: any = {}
      if (userWithRoles.employee.dataIn) {
        try {
          employeeDataIn = typeof userWithRoles.employee.dataIn === 'string' 
            ? JSON.parse(userWithRoles.employee.dataIn) 
            : userWithRoles.employee.dataIn
        } catch (e) {
          console.error('Failed to parse employee dataIn:', e)
        }
      }

      locationLaid = employeeDataIn?.location_laid

      if (!locationLaid) {
        return new Response(
          JSON.stringify({ 
            error: 'Локация сотрудника не настроена. В вашем профиле сотрудника не указана локация (склад). Обратитесь к администраторам системы для настройки вашего профиля.' 
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      location = userWithRoles.location ? {
        laid: userWithRoles.location.laid,
        fullLaid: userWithRoles.location.fullLaid,
        title: userWithRoles.location.title,
        city: userWithRoles.location.city,
        type: userWithRoles.location.type,
      } : undefined
    }

    // Validate required fields
    if (!body.title) {
      return new Response(
        JSON.stringify({ 
          error: 'Не заполнено обязательное поле "Название". Пожалуйста, укажите название входящей машины.' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Create receiving base move
    const repository = BaseMovesRepository.getInstance()
    const created = await repository.createReceiving({
      title: body.title,
      transportCost: toKopecks(body.transportCost),
      date: body.date,
      ownerEaid,
      locationLaid: locationLaid,
      location,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: created.id,
          uuid: created.uuid,
          title: created.title,
          statusName: created.statusName,
          createdAt: created.createdAt,
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Create receiving error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось создать запись о входящей машине. Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте еще раз или обратитесь к администраторам системы с сообщением об этой ошибке.',
        details: String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const POST = withManagerGuard(handlePost)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}


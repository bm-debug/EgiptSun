/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { MeRepository } from '@/shared/repositories/me.repository'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'

/**
 * POST /api/store/v2/s/sending
 * Creates a new sending base move
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env, user: sessionUserWithRoles } = context

  try {
    // Parse request body
    const body = await request.json() as {
      title?: string
      date?: string
      contractorCaid?: string
      transportPrice?: number
      ownerEaid?: string
    }

    // Determine owner and location
    let ownerEaid: string
    let locationLaid: string | null = null

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
    } else {
      // Fallback to current user
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
    }

    // Validate required fields
    if (!body.title) {
      return new Response(
        JSON.stringify({ 
          error: 'Не заполнено обязательное поле "Название". Пожалуйста, укажите название исходящей машины.' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Create sending base move
    const repository = BaseMovesRepository.getInstance()
    const created = await repository.createSending({
      title: body.title,
      date: body.date,
      ownerEaid,
      laidFrom: locationLaid,
      laidTo: undefined, // Will be set later or remains undefined
      contractorCaid: body.contractorCaid,
      transportPrice: body.transportPrice,
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: created.id,
          uuid: created.uuid,
          fullBaid: created.fullBaid,
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
    console.error('Create sending error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось создать запись об исходящей машине. Произошла внутренняя ошибка сервера. Пожалуйста, попробуйте еще раз или обратитесь к администраторам системы с сообщением об этой ошибке.',
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


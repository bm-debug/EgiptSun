/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { BaseMovesRepository } from '@/shared/repositories/base-moves.repository'
import { MeRepository } from '@/shared/repositories/me.repository'

/**
 * POST /api/store/v2/m/transition
 * Creates a new transition (two base moves: sending and receiving)
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env, user: sessionUserWithRoles } = context

  try {
    // Parse request body
    const body = await request.json() as {
      title?: string
      date?: string
      destinationLocationLaid: string
      transportPrice?: number
      ownerEaid?: string
    }

    // Validate required fields
    if (!body.destinationLocationLaid) {
      return new Response(
        JSON.stringify({ 
          error: 'Поле "Склад назначения" обязательно для заполнения' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Determine owner and source location
    let ownerEaid: string
    let sourceLocationLaid: string | null = null

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

      sourceLocationLaid = employeeDataIn?.location_laid

      if (!sourceLocationLaid) {
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
            error: 'Информация о сотруднике не найдена. Ваш аккаунт не связан с профилем сотрудника в системе.' 
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

      sourceLocationLaid = employeeDataIn?.location_laid

      if (!sourceLocationLaid) {
        return new Response(
          JSON.stringify({ 
            error: 'Локация сотрудника не настроена. В вашем профиле сотрудника не указана локация (склад).' 
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Validate that source and destination are different
    if (sourceLocationLaid === body.destinationLocationLaid) {
      return new Response(
        JSON.stringify({ 
          error: 'Склад отправления и склад назначения не могут быть одинаковыми' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const repository = BaseMovesRepository.getInstance()

    // Create sending base move
    const sendingMove = await repository.createSending({
      title: body.title || 'Новое перемещение (отправка)',
      date: body.date,
      ownerEaid,
      laidFrom: sourceLocationLaid,
      laidTo: undefined,
      transportPrice: body.transportPrice,
    })

    // Create receiving base move for destination with link to sending
    const receivingMove = await repository.createReceiving({
      title: body.title || 'Новое перемещение (приход)',
      date: body.date,
      ownerEaid,
      laidFrom: undefined,
      laidTo: body.destinationLocationLaid,
      transportPrice: body.transportPrice,
      sendingBaid: sendingMove.fullBaid || undefined, // Link to sending move
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          fullBaid: sendingMove.fullBaid,
          transitionFullBaid: receivingMove.fullBaid,
          sendingMove: {
            id: sendingMove.id,
            uuid: sendingMove.uuid,
            fullBaid: sendingMove.fullBaid,
            title: sendingMove.title,
            statusName: sendingMove.statusName,
            laidFrom: sendingMove.laidFrom,
            createdAt: sendingMove.createdAt,
          },
          receivingMove: {
            id: receivingMove.id,
            uuid: receivingMove.uuid,
            fullBaid: receivingMove.fullBaid,
            title: receivingMove.title,
            statusName: receivingMove.statusName,
            laidTo: receivingMove.laidTo,
            createdAt: receivingMove.createdAt,
          },
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Create transition error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось создать перемещение. Произошла внутренняя ошибка сервера.',
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


/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema'
import { eq, isNull } from 'drizzle-orm'

/**
 * GET /api/store/v2/m/employees?role=storekeeper
 * Returns employees with specified role
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context

  try {
    const url = new URL(request.url)
    const roleFilter = url.searchParams.get('role')

    const db = createDb(env.DB)
    
    // Get all employees (not soft-deleted)
    const employees = await db
      .select({
        id: schema.employees.id,
        uuid: schema.employees.uuid,
        eaid: schema.employees.eaid,
        fullEaid: schema.employees.fullEaid,
        dataIn: schema.employees.dataIn,
        haid: schema.employees.haid,
      })
      .from(schema.employees)
      .where(isNull(schema.employees.deletedAt))
      .execute()

    // If role filter is specified, filter by users who have that role
    let filteredEmployees = employees
    
    if (roleFilter) {
      // Get all human aids that belong to users with the specified role
      const users = await db
        .select({
          uuid: schema.users.uuid,
          humanAid: schema.users.humanAid,
        })
        .from(schema.users)
        .execute()

      const userRoles = await db
        .select({
          userUuid: schema.userRoles.userUuid,
          roleUuid: schema.userRoles.roleUuid,
        })
        .from(schema.userRoles)
        .execute()

      const roles = await db
        .select({
          uuid: schema.roles.uuid,
          name: schema.roles.name,
        })
        .from(schema.roles)
        .where(isNull(schema.roles.deletedAt))
        .execute()

      const targetRoleUuids = roles
        .filter((role: any) => role.name === roleFilter)
        .map((role: any) => role.uuid)

      const userUuidsWithRole = new Set(
        userRoles
          .filter((ur: any) => targetRoleUuids.includes(ur.roleUuid))
          .map((ur: any) => ur.userUuid)
      )

      const humanAidsWithRole = new Set(
        users
          .filter((user: any) => userUuidsWithRole.has(user.uuid))
          .map((user: any) => user.humanAid)
          .filter(Boolean)
      )

      filteredEmployees = employees.filter((emp: any) => 
        emp.haid && humanAidsWithRole.has(emp.haid)
      )
    }

    // Get human info for each employee
    const employeesWithHuman = await Promise.all(
      filteredEmployees.map(async (emp: any) => {
        let dataIn = null
        if (emp.dataIn) {
          try {
            dataIn = typeof emp.dataIn === 'string' ? JSON.parse(emp.dataIn) : emp.dataIn
          } catch {
            dataIn = null
          }
        }

        let human = null
        if (emp.haid) {
          const [humanData] = await db
            .select({
              uuid: schema.humans.uuid,
              haid: schema.humans.haid,
              fullName: schema.humans.fullName,
            })
            .from(schema.humans)
            .where(eq(schema.humans.haid, emp.haid))
            .limit(1)

          human = humanData || null
        }

        return {
          id: emp.id,
          uuid: emp.uuid,
          eaid: emp.eaid,
          fullEaid: emp.fullEaid,
          dataIn,
          human,
        }
      })
    )

    return new Response(
      JSON.stringify({
        success: true,
        employees: employeesWithHuman,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get employees error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось получить список сотрудников',
        details: String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const GET = withManagerGuard(handleGet)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}


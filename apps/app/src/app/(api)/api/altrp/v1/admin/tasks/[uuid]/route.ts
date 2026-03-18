import { NextRequest, NextResponse } from 'next/server'
import { GoalsRepository } from '@/shared/repositories/goals.repository'
import { buildRequestEnv } from '@/shared/env'
import { getSession } from '@/shared/session'
import { MeRepository, type UserWithRoles } from '@/shared/repositories/me.repository'
import type { Goal } from '@/shared/schema/types'
import { parseJson } from '@/shared/repositories/utils'
import {
  AdminTaskDataIn,
  TaskPriority,
  TaskResponse,
  TaskStatus,
  UpdateTaskPayload,
} from '@/shared/types/tasks'

const jsonHeaders = { 'content-type': 'application/json' }

const uiStatusToDb = (status: TaskStatus | undefined): string => {
  switch (status) {
    case 'in-progress':
      return 'IN_PROGRESS'
    case 'done':
      return 'DONE'
    case 'todo':
    default:
      return 'TODO'
  }
}

const dbStatusToUi = (statusName?: string | null): TaskStatus => {
  const normalized = (statusName || '').toUpperCase()
  switch (normalized) {
    case 'IN_PROGRESS':
      return 'in-progress'
    case 'DONE':
      return 'done'
    default:
      return 'todo'
  }
}

const normalizePriority = (priority?: string | null): TaskPriority => {
  const normalized = (priority || '').toLowerCase()
  if (normalized === 'high') return 'high'
  if (normalized === 'low') return 'low'
  return 'medium'
}

const buildAssigneeName = (user: UserWithRoles): string => {
  const humanName = user.human?.fullName
  if (humanName) return humanName
  if (user.user?.email) return user.user.email
  return 'Не назначен'
}

const mapGoalToTask = (goal: Goal): TaskResponse => {
  const dataIn = parseJson<AdminTaskDataIn>(goal.dataIn, {})
  return {
    uuid: goal.uuid,
    title: goal.title || 'Без названия',
    status: dbStatusToUi(goal.statusName),
    priority: normalizePriority(dataIn?.priority),
    clientLink: dataIn?.clientLink || '',
    taskThreadMaid: dataIn?.taskThreadMaid,
    assignee: {
      uuid: dataIn?.assigneeUuid,
      name: dataIn?.assigneeName || 'Не назначен',
      avatar: dataIn?.assigneeAvatar ?? null,
    },
    createdAt: goal.createdAt ? (goal.createdAt instanceof Date ? goal.createdAt.toISOString() : String(goal.createdAt)) : null,
    updatedAt: goal.updatedAt ? (goal.updatedAt instanceof Date ? goal.updatedAt.toISOString() : String(goal.updatedAt)) : null,
  }
}

const isAdminUser = (user: UserWithRoles): boolean =>
  user.roles.some((role) => role.name === 'Administrator' || role.name === 'admin' || role.isSystem === true)

const authenticate = async (
  request: NextRequest
): Promise<{ user: UserWithRoles } | { response: NextResponse }> => {
  const env = buildRequestEnv()

  if (!env.AUTH_SECRET) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Authentication not configured',
        },
        { status: 500, headers: jsonHeaders }
      ),
    }
  }

  const session = await getSession(request, env.AUTH_SECRET)
  if (!session?.id) {
    return {
      response: NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Unauthorized' },
        { status: 401, headers: jsonHeaders }
      ),
    }
  }

  const meRepo = MeRepository.getInstance()
  const user = await meRepo.findByIdWithRoles(Number(session.id), { includeHuman: true })

  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'User not found' },
        { status: 401, headers: jsonHeaders }
      ),
    }
  }

  return { user }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  const auth = await authenticate(request)
  if ('response' in auth) {
    return auth.response
  }

  const { uuid } = await context.params

  let body: UpdateTaskPayload
  try {
    body = (await request.json()) as UpdateTaskPayload
  } catch {
    return NextResponse.json(
      { success: false, error: 'BAD_REQUEST', message: 'Invalid JSON body' },
      { status: 400, headers: jsonHeaders }
    )
  }

  const hasAnyChange =
    Object.prototype.hasOwnProperty.call(body, 'status') ||
    Object.prototype.hasOwnProperty.call(body, 'title') ||
    Object.prototype.hasOwnProperty.call(body, 'clientLink') ||
    Object.prototype.hasOwnProperty.call(body, 'priority') ||
    Object.prototype.hasOwnProperty.call(body, 'assigneeUuid') ||
    Object.prototype.hasOwnProperty.call(body, 'deadline')

  if (!hasAnyChange) {
    return NextResponse.json(
      { success: false, error: 'VALIDATION_ERROR', message: 'Nothing to update' },
      { status: 400, headers: jsonHeaders }
    )
  }

  try {
    const goalsRepository = GoalsRepository.getInstance()
    const existing = await goalsRepository.findAdminTaskByUuid(uuid)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Task not found' },
        { status: 404, headers: jsonHeaders }
      )
    }

    const isAdmin = isAdminUser(auth.user)
    if (!isAdmin && existing.xaid && existing.xaid !== auth.user.user.uuid) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'You cannot modify this task' },
        { status: 403, headers: jsonHeaders }
      )
    }

    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      const title = (body.title || '').trim()
      if (!title) {
        return NextResponse.json(
          { success: false, error: 'VALIDATION_ERROR', message: 'Title is required' },
          { status: 400, headers: jsonHeaders }
        )
      }
    }

    const existingDataIn = parseJson<AdminTaskDataIn>(existing.dataIn, {})
    const nextDataIn: AdminTaskDataIn = { ...existingDataIn }

    let nextAssigneeUuid = existing.xaid || existingDataIn.assigneeUuid
    let nextAssigneeName = existingDataIn.assigneeName
    let nextAssigneeAvatar = existingDataIn.assigneeAvatar ?? null

    if (isAdmin && Object.prototype.hasOwnProperty.call(body, 'assigneeUuid')) {
      const requestedAssigneeUuid = (body.assigneeUuid || '').trim()
      if (!requestedAssigneeUuid) {
        nextAssigneeUuid = undefined
        nextAssigneeName = undefined
        nextAssigneeAvatar = null
      } else {
        const meRepo = MeRepository.getInstance()
        const assigneeUser = await meRepo.findByUuidWithRoles(requestedAssigneeUuid, { includeHuman: true })

        if (!assigneeUser) {
          return NextResponse.json(
            { success: false, error: 'NOT_FOUND', message: 'Assignee not found' },
            { status: 404, headers: jsonHeaders }
          )
        }

        nextAssigneeUuid = requestedAssigneeUuid
        nextAssigneeName = buildAssigneeName(assigneeUser)
        // Keep avatar unchanged unless we have a reliable source for it
        nextAssigneeAvatar = existingDataIn.assigneeAvatar ?? null
      }

      nextDataIn.assigneeUuid = nextAssigneeUuid
      nextDataIn.assigneeName = nextAssigneeName
      nextDataIn.assigneeAvatar = nextAssigneeAvatar
    }

    if (Object.prototype.hasOwnProperty.call(body, 'clientLink')) {
      nextDataIn.clientLink = body.clientLink ? String(body.clientLink) : ''
    }

    if (Object.prototype.hasOwnProperty.call(body, 'priority')) {
      nextDataIn.priority = normalizePriority(body.priority)
    }

    if (Object.prototype.hasOwnProperty.call(body, 'deadline')) {
      nextDataIn.deadline = body.deadline ? String(body.deadline) : undefined
    }

    const updatePayload: Partial<Goal> = {
      dataIn: nextDataIn,
    }

    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      updatePayload.title = (body.title || '').trim()
    }

    if (Object.prototype.hasOwnProperty.call(body, 'status') && body.status) {
      updatePayload.statusName = uiStatusToDb(body.status)
    }

    if (isAdmin && Object.prototype.hasOwnProperty.call(body, 'assigneeUuid')) {
      updatePayload.xaid = nextAssigneeUuid
    }

    const updated = await goalsRepository.update(uuid, updatePayload)

    return NextResponse.json(
      {
        success: true,
        task: mapGoalToTask(updated as Goal),
      },
      { status: 200, headers: jsonHeaders }
    )
  } catch (error) {
    console.error('Failed to update task', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500, headers: jsonHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...jsonHeaders,
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'PATCH, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  const auth = await authenticate(request)
  if ('response' in auth) {
    return auth.response
  }

  const { uuid } = await context.params

  try {
    const goalsRepository = GoalsRepository.getInstance()
    const existing = await goalsRepository.findAdminTaskByUuid(uuid)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Task not found' },
        { status: 404, headers: jsonHeaders }
      )
    }

    const isAdmin = isAdminUser(auth.user)
    if (!isAdmin && existing.xaid && existing.xaid !== auth.user.user.uuid) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'You cannot delete this task' },
        { status: 403, headers: jsonHeaders }
      )
    }

    await goalsRepository.deleteByUuid(uuid)

    return NextResponse.json({ success: true }, { status: 200, headers: jsonHeaders })
  } catch (error) {
    console.error('Failed to delete task', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500, headers: jsonHeaders }
    )
  }
}


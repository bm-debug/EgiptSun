import { NextRequest, NextResponse } from 'next/server'
import { GoalsRepository } from '@/shared/repositories/goals.repository'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { buildRequestEnv } from '@/shared/env'
import { getSession } from '@/shared/session'
import { MeRepository, type UserWithRoles } from '@/shared/repositories/me.repository'
import type { Goal } from '@/shared/schema/types'
import { parseJson } from '@/shared/repositories/utils'
import {
  AdminTaskDataIn,
  CreateTaskPayload,
  TaskPriority,
  TaskResponse,
  TaskStatus,
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

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if ('response' in auth) {
    return auth.response
  }

  try {
    const url = new URL(request.url)
    const statusParam = url.searchParams.get('status')
    const statusFilters = statusParam
      ? statusParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => uiStatusToDb(s as TaskStatus))
      : undefined

    const goalsRepository = GoalsRepository.getInstance()
    const tasks = await goalsRepository.getAdminTasks({
      assigneeUuid: isAdminUser(auth.user) ? undefined : auth.user.user.uuid,
      statuses: statusFilters,
    })

    return NextResponse.json(
      {
        success: true,
        tasks: tasks.map(mapGoalToTask),
      },
      { status: 200, headers: jsonHeaders }
    )
  } catch (error) {
    console.error('Failed to fetch tasks', error)
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

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if ('response' in auth) {
    return auth.response
  }

  let body: CreateTaskPayload
  try {
    body = (await request.json()) as CreateTaskPayload
  } catch {
    return NextResponse.json(
      { success: false, error: 'BAD_REQUEST', message: 'Invalid JSON body' },
      { status: 400, headers: jsonHeaders }
    )
  }

  if (!body.title || body.title.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'VALIDATION_ERROR', message: 'Title is required' },
      { status: 400, headers: jsonHeaders }
    )
  }

  try {
    if (!auth.user.humanAid) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'User humanHaid is required' },
        { status: 400, headers: jsonHeaders }
      )
    }
    const assigneeUuid = isAdminUser(auth.user)
      ? body.assigneeUuid || auth.user.user.uuid
      : auth.user.user.uuid

    const meRepo = MeRepository.getInstance()
    const assigneeUser = await meRepo.findByUuidWithRoles(assigneeUuid, { includeHuman: true })

    if (!assigneeUser) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Assignee not found' },
        { status: 404, headers: jsonHeaders }
      )
    }

    const priority = normalizePriority(body.priority)
    const assigneeName = body.assigneeName || buildAssigneeName(assigneeUser)

    const goalsRepository = GoalsRepository.getInstance()
    const created = await goalsRepository.createAdminTask({
      title: body.title.trim(),
      statusName: uiStatusToDb(body.status),
      priority,
      assigneeUuid,
      assigneeName,
      clientLink: body.clientLink,
      createdByHumanHaid: auth.user.humanAid,
    })

    // Create message thread for task communication
    const messageThreadsRepository = MessageThreadsRepository.getInstance()
    const taskThread = await messageThreadsRepository.create({
      title: body.title.trim(),
      type: 'TASK',
      dataIn: {
        humanHaid: auth.user.humanAid,
        goalUuid: created.uuid,
      },
    })

    // Attach thread maid to goal dataIn
    await goalsRepository.update(created.uuid, {
      dataIn: {
        ...(created.dataIn as any),
        taskThreadMaid: taskThread.maid,
        createdByHumanHaid: auth.user.humanAid,
      },
    })

    const createdDataIn = (created.dataIn && typeof created.dataIn === 'object' && !Array.isArray(created.dataIn))
      ? created.dataIn as Record<string, any>
      : {}
    
    return NextResponse.json(
      {
        success: true,
        task: mapGoalToTask({
          ...created,
          dataIn: {
            ...createdDataIn,
            taskThreadMaid: taskThread.maid,
            createdByHumanHaid: auth.user.humanAid,
          },
        } as Goal),
      },
      { status: 201, headers: jsonHeaders }
    )
  } catch (error) {
    console.error('Failed to create task', error)
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
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  })
}


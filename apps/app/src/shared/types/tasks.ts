import { InferSelectModel } from 'drizzle-orm'
import { goals } from '../schema/goals'

export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export type AdminTaskEntity = InferSelectModel<typeof goals>

export interface TaskAssignee {
  uuid?: string
  name: string
  avatar?: string | null
}

export interface AdminTaskDataIn {
  priority?: TaskPriority
  clientLink?: string
  assigneeUuid?: string
  assigneeName?: string
  assigneeAvatar?: string | null
  createdByHumanHaid?: string
  deadline?: string
  taskThreadMaid?: string
}

export interface TaskApi {
  uuid: string
  title: string
  clientLink?: string
  priority: TaskPriority
  status: TaskStatus
  assignee: TaskAssignee
  taskThreadMaid?: string
  createdAt?: string | null
  updatedAt?: string | null
}

export type TaskResponse = TaskApi

export interface CreateTaskPayload {
  title?: string
  clientLink?: string
  priority?: TaskPriority
  status?: TaskStatus
  assigneeUuid?: string
  assigneeName?: string
  createdByHumanHaid?: string
}

export interface UpdateTaskPayload {
  status?: TaskStatus
  title?: string
  clientLink?: string
  priority?: TaskPriority
  assigneeUuid?: string
  deadline?: string
}

export interface CurrentUser {
  uuid: string
  name: string
  roles: { name?: string }[]
  isAdmin: boolean
  humanAid?: string | null
}


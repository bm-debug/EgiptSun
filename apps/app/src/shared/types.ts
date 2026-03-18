import { User, Role, Human, Employee } from './schema/types'
import { SiteDbPostgres } from './repositories/utils'

export type Env = NodeJS.ProcessEnv & {
    AUTH_SECRET?: string
    DB?: SiteDbPostgres
    AI_API_URL?: string
    AI_API_TOKEN?: string
    BOT_TOKEN?: string
    TRANSCRIPTION_MODEL?: string
}

export interface TableInfo {
    name: string
    type: string
  }
  
export interface CollectionGroup {
    category: string
    collections: string[]
  }
export interface Context {
    request: Request
    env: Env
    params?: Record<string, string>
}


export interface UserWithRoles extends User {
    roles: Role[]
    human?: Human
    employee?: Employee
}

export interface SessionUser {
    id: number | string
    email: string
    name?: string
    role?: string
    sessionUuid?: string
}


export interface SessionData {
    user: SessionUser
    expiresAt: number
    sessionUuid?: string
}

export interface AuthenticatedContext extends Context {
    user: SessionUser
}

export interface CollectionStats {
    name: string
    count: number
    hasDeleted?: boolean
    hasUuid?: boolean
  }

// Admin listing/types shared between client and worker
export type AdminFilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "in"

export interface AdminFilter {
    field: string
    op: AdminFilterOp
    value: unknown
}

export interface AdminState {
    collection: string
    page: number
    pageSize: number
    filters: AdminFilter[]
    search: string
}

type RequestContext = {
    request: Request
    env: Env
    params?: Record<string, string>
  }
export type { RequestContext }
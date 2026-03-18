import qs from "qs"
import { NewRole, NewSetting, Role, Setting } from "@/shared/schema"
import { DbPaginatedResult, DbResult, DbFilters } from "@/shared/types/shared"

export interface GetSettingResponse {
  success: boolean
  settings: Setting | null
}

export interface UpdateSettingBody {
  uuid: string
  dataIn?: unknown
  value?: string
}

export interface UpdateSettingResponse {
  success: boolean
  setting: Setting
}

export interface AdminStateSchemaColumn {
  name: string
  type: string
  nullable?: boolean
  primary?: boolean
  virtual?: boolean
}

export interface GetAdminStateResponse {
  success: boolean
  state: unknown
  schema: {
    columns: AdminStateSchemaColumn[]
    total: number
    totalPages: number
  }
  data: unknown[]
}

export const apiMethods = {
  // GET /roles
  getRoles: {
    method: "GET" as const,
    url: () => "/api/admin/rest/schema/roles",
    response: {} as DbPaginatedResult<Role>,
    pathParams: undefined as undefined,
    body: undefined as undefined,
  },

  // GET /roles/:id
  getRole: {
    method: "GET" as const,
    url: (params: { id: number }) => `/api/admin/rest/schema/roles/${params.id}`,
    response: {} as DbResult<Role>,
    pathParams: {} as { id: number },
    body: undefined as undefined,
  },

  // POST /roles
  newRole: {
    method: "POST" as const,
    url: () => "/api/roles",
    response: {} as DbResult<Role>,
    pathParams: undefined as undefined,
    body: {} as Partial<NewRole>,
  },

  // PUT /roles/:id
  updateRole: {
    method: "PUT" as const,
    url: (params: { id: number }) => `/api/admin/rest/schema/roles/${params.id}`,
    response: {} as DbResult<Role>,
    pathParams: {} as { id: number },
    body: {} as Partial<Role>,
  },

  // DELETE /roles/:id
  deleteRole: {
    method: "DELETE" as const,
    url: (params: { id: number }) => `/api/admin/rest/schema/roles/${params.id}`,
    response: {} as { success: true },
    pathParams: {} as { id: number },
    body: undefined as undefined,
  },

  // GET /api/altrp/v1/admin/settings — filters (DbFilters) mapped to ?attribute= & ?uuid=
  getSetting: {
    method: "GET" as const,
    url: (params?: { filters: DbFilters }) => {
      const base = "/api/admin/rest/schema/settings"
      return `${base}?${qs.stringify(params)}`
    },
    response: {} as DbPaginatedResult<Setting>,
    pathParams: {} as  { filters: DbFilters },
    body: undefined as undefined,
  },
  postSetting: {
    method: "POST" as const,
    url: () =>  `/api/admin/rest/schema/settings`,
    pathParams: undefined as undefined,
    response: {} as DbPaginatedResult<Setting>,
    body:{}as Partial<NewSetting>,
  },

  // PUT /api/admin/rest/schema/settings/:id
  updateSetting: {
    method: "PUT" as const,
    url: (params: { id: number }) => `/api/admin/rest/schema/settings/${params.id}`,
    response: {} as DbResult<Setting>,
    pathParams: {} as { id: number },
    body: {} as Partial<Setting>,
  },

  // PUT /api/admin/role-schema-settings
  saveRoleSchemaSetting: {
    method: "PUT" as const,
    url: () => "/api/admin/role-schema-settings",
    response: {} as DbResult<Setting>,
    pathParams: undefined as undefined,
    body: {} as { uuid: string; dataIn: unknown },
  },

  getCollections: {
    method: "GET" as const,
    url: () => "/api/admin/collections",
    response: {} as { success: boolean; groups: { category: string; collections: string[] }[]; total: number },
    pathParams: undefined as undefined,
    body: undefined as undefined,
  },

  getAdminState: {
    method: "GET" as const,
    url: (params?: { c?: string; ps?: number; filters?: unknown[]; p?: number; s?: string; sorting?: unknown }) => {
      const base = "/api/admin/state"
      return params ? `${base}?${qs.stringify(params)}` : base
    },
    pathParams: {} as { c?: string; ps?: number; filters?: unknown[]; p?: number; s?: string; sorting?: unknown },
    response: {} as GetAdminStateResponse,
    body: undefined as undefined,
  },
} as const

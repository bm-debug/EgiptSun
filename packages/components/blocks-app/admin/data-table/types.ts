import type { AdminFilter } from "@/shared/types"

export type ColumnSchema = {
  name: string
  type: string
  nullable: boolean
  primary: boolean
}

export type RelationConfig = {
  collection: string
  valueField: string
  labelField: string
  labelFields?: string[]
  filters?: AdminFilter[]
  inheritSearch?: boolean
}

export type SelectOption = {
  label: string
  value: string
}

export type DataInEntry = {
  key: string
  title: string
  value: string
}

export type ColumnAlignment = Record<string, "left" | "center" | "right">

export type ColumnFilterValues = Record<string, string | string[]>

export type FilterSettings = {
  dateFilter: boolean
  statusFilter: boolean
  cityFilter: boolean
  columnFilters: boolean
}

export type ColumnSchemaExtended = ColumnSchema & {
  title?: string
  hidden?: boolean
  hiddenTable?: boolean
  readOnly?: boolean
  required?: boolean
  virtual?: boolean
  defaultCell?: any
  format?: (value: any, locale?: string) => string
  fieldType?: 'text' | 'number' | 'email' | 'phone' | 'password' | 'boolean' | 'date' | 'time' | 'datetime' | 'json' | 'array' | 'object' | 'price' | 'enum' | 'select' | 'tiptap' | 'images'
  textarea?: boolean
  enum?: {
    values: string[]
    labels: string[]
  }
  relation?: RelationConfig
  selectOptions?: SelectOption[]
}

export type CollectionData = Record<string, any>

export type StateResponse = {
  success: boolean
  error?: string
  state: {
    collection: string
    page: number
    pageSize: number
    filters: AdminFilter[]
  }
  schema: {
    columns: ColumnSchema[]
    total: number
    totalPages: number
  }
  data: CollectionData[]
}

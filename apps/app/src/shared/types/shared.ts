export const DB_FILTER_OPERATORS = [
  "exclude", "like", "in", "notIn", "isNull", "isNotNull",
  "between", "notBetween", "gt", "gte", "lt", "lte", "eq", "neq",
] as const;

export type DbFilterOperator = (typeof DB_FILTER_OPERATORS)[number];

export const DB_FILTER_OPERATORS_SET = new Set<string>(DB_FILTER_OPERATORS);

export const ADMINISTRATOR_ROLE = "Administrator"

export interface DbFilterCondition {
    field: string;
    operator: DbFilterOperator;
    values: Array<string | number | boolean | null>;
}

export interface DbFilters {
    conditions?: DbFilterCondition[];
}

export interface DbOrder {
    field: string;
    direction: 'asc' | 'desc';
}

export interface DbOrders {
    orders?: DbOrder[];
}

export interface DbPagination {
    page?: number;
    limit?: number;
}

export interface DbPaginationResult {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface DbPaginatedResult<T> {
    docs: T[];
    pagination: DbPaginationResult;
}


export interface DbResult<T> {
  success?: true;
  doc: T
}

export interface MeUser {
    id: string
    uuid: string
    email: string
    name: string
    language?: string
    phone?: string
    humanAid?: string | null
    roles: Array<{
      uuid: string
      title: string
      name: string
      description: string | null
      isSystem: boolean
      dataIn: any
    }>
  }

export interface ChatRequest {
  message: string;
  context?: {
    scene_gaid?: string;
    text_content?: string;
  };
}

export interface ChatResponse {
  response: string;
}
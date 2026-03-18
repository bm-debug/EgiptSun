import qs from "qs"
import { type SortingState } from "@tanstack/react-table"
import { getInitialLocale, LanguageCode } from "@/lib/getInitialLocale"

export interface AdminFilter {
  field: string
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "in"
  value: unknown
}

export interface AdminState {
  collection: string
  page: number
  pageSize: number
  filters: AdminFilter[]
  search: string
  sorting: SortingState
  locale: LanguageCode
}

const DEFAULT_STATE: AdminState = {
  collection: "users",
  page: 1,
  pageSize: 10,
  filters: [],
  search: "",
  sorting: [],
  locale: getInitialLocale()
}

/**
 * Parse admin state from URL query parameters
 * 
 * @param url - URL object to parse query parameters from
 * @returns AdminState object with parsed values
 * 
 * @example
 * const url = new URL("http://example.com/admin?c=users&p=1&ps=10")
 * const state = parseStateFromUrl(url)
 */
export function parseStateFromUrl(url: URL): AdminState {
  // Parse query string with qs
  const parsed = qs.parse(url.search.slice(1))
  
  const collection = (parsed.c as string) || DEFAULT_STATE.collection
  const page = Math.max(1, Number(parsed.p) || DEFAULT_STATE.page)
  const pageSize = Math.max(1, Number(parsed.ps) || DEFAULT_STATE.pageSize)
  const search = (parsed.s as string) || DEFAULT_STATE.search
  const locale = (parsed.locale as LanguageCode) || DEFAULT_STATE.locale
  
  // Parse sorting from string format "field1:asc,field2:desc" to SortingState
  let sorting: SortingState | undefined = (parsed.sorting as Array<any> || []).filter(sortItem=>sortItem.id).map((sortItem ) => {
    return {
      id: sortItem.id,
      desc: sortItem.desc === 'true'
    }
  }) 
  

  let filters: AdminFilter[] = []
  if (parsed.filters) {
    if (Array.isArray(parsed.filters)) {
      // Filters as array: filters[0][field]=...&filters[0][op]=...
      filters = parsed.filters.filter((item: any) => item && typeof item.field === "string") as unknown as AdminFilter[]
    } else if (typeof parsed.filters === 'object') {
      // Filters as object with numeric keys: filters[0][field]=...&filters[1][field]=...
      // Convert to array
      const filterArray = Object.keys(parsed.filters)
        .sort((a, b) => Number(a) - Number(b))
        .map(key => (parsed.filters as any)[key])
        .filter((item: any) => item && typeof item.field === "string")
      filters = filterArray as unknown as AdminFilter[]
    }
  }
  
  return { collection, page, pageSize, filters, search, sorting, locale }
}

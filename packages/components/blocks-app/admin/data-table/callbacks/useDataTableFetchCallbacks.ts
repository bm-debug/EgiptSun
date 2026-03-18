import * as React from "react"
import qs from "qs"
import type { StateResponse, ColumnSchemaExtended, CollectionData, SelectOption } from "../types"
import type { AdminFilter } from "@/shared/types"
import { getCollection } from "@/shared/collections/getCollection"
import BaseColumn from "@/shared/columns/BaseColumn"
import type { LanguageCode } from "../state/useDataTableMetaState"

type FetchDataParams = {
  collection: string
  page: number
  pageSize: number
  search: string
  filters: AdminFilter[]
  locale: LanguageCode
  setState: (updater: (prev: any) => any) => void
  setData: (data: CollectionData[]) => void
  setSchema: (schema: ColumnSchemaExtended[]) => void
  setTotal: (total: number) => void
  setTotalPages: (totalPages: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setRelationData: (data: Record<string, Record<any, string>>) => void
  taxonomyConfig: any
  translations: any
  segmentStatuses: SelectOption[]
  searchConditionsRef: React.MutableRefObject<any[]>
  sortingRef: React.MutableRefObject<any[]>
  filtersString: string
  isFetchingRef: React.MutableRefObject<boolean>
  lastFetchParamsRef: React.MutableRefObject<string>
}

export function useDataTableFetchCallbacks({
  collection,
  page,
  pageSize,
  search,
  filters,
  locale,
  setState,
  setData,
  setSchema,
  setTotal,
  setTotalPages,
  setLoading,
  setError,
  setRelationData,
  taxonomyConfig,
  translations,
  segmentStatuses,
  searchConditionsRef,
  sortingRef,
  filtersString,
  isFetchingRef,
  lastFetchParamsRef,
}: FetchDataParams) {
  const fetchData = React.useCallback(
    async (abortSignal?: AbortSignal, isMountedRef?: { current: boolean }) => {
      setLoading(true)
      setError(null)
      try {
        const hasSearchOperators = searchConditionsRef.current.some((c) => c.operator)
        const serverSearch = hasSearchOperators ? undefined : search
        const serverPageSize = hasSearchOperators ? 10000 : pageSize
        const serverPage = hasSearchOperators ? 1 : page

        const currentSorting = sortingRef.current

        const queryParams = qs.stringify({
          c: collection,
          p: serverPage,
          ps: serverPageSize,
          locale,
          ...(serverSearch && { s: serverSearch }),
          ...(filters.length > 0 && { filters }),
          ...(currentSorting && { sorting: currentSorting }),
        })

        const res = await fetch(`/api/admin/state?${queryParams}`, {
          signal: abortSignal,
          credentials: "include",
        })

        if (isMountedRef && !isMountedRef.current) return

        if (!res.ok) {
          const errorText = await res.text()
          console.warn("[DataTable] Fetch warning details:", {
            status: res.status,
            statusText: res.statusText,
            url: res.url,
            errorText,
            queryParams,
          })
          throw new Error(`Failed to load: ${res.status}`)
        }
        const json: StateResponse = await res.json()

        if (isMountedRef && !isMountedRef.current) return

        const collectionConfig = getCollection(collection)

        const inferFieldTypeFromDbType = (
          dbType: string | undefined
        ): ColumnSchemaExtended["fieldType"] | undefined => {
          const t = (dbType || "").toUpperCase()
          if (!t) return undefined
          if (t === "JSON" || t === "JSONB") return "json"
          if (t === "BOOLEAN") return "boolean"
          if (t === "DATE") return "date"
          if (t.startsWith("TIMESTAMP")) return "datetime"
          if (t === "TIME") return "time"
          if (t === "INTEGER" || t === "BIGINT" || t === "SMALLINT") return "number"
          if (t === "NUMERIC" || t === "DECIMAL" || t === "REAL" || t === "DOUBLE PRECISION")
            return "number"
          return "text"
        }

        let extendedColumns: ColumnSchemaExtended[] = json.schema.columns.map((col) => {
          const fieldColumn = (collectionConfig as any)[col.name] as BaseColumn | undefined
          const options = fieldColumn?.options || {}

          let fieldConfig: any = null
          if (collection === "taxonomy" && taxonomyConfig?.fields) {
            fieldConfig = taxonomyConfig.fields.find((f: any) => f.name === col.name)
          }

          const isSystemField = ["deleted_at", "uuid"].includes(col.name)

          let selectOptions: SelectOption[] | undefined
          if (fieldConfig?.type === "select" && fieldConfig?.options?.length) {
            const entityOptions = (translations as any)?.taxonomy?.entityOptions || {}
            selectOptions = fieldConfig.options.map((opt: any) => {
              const value = opt.value || opt
              const translatedLabel = entityOptions[value] || opt.label || value
              return {
                label: translatedLabel,
                value: String(value),
              }
            })
          } else if ((options as any).type === "select" && (options as any).selectOptions?.length) {
            selectOptions = (options as any).selectOptions.map((opt: any) => ({
              label: opt.label || opt.value,
              value: opt.value || opt,
            }))
          } else if ((options as any).type === "enum" && (options as any).enum?.values?.length) {
            const enumOpts = (options as any).enum
            selectOptions = enumOpts.values.map((val: string, idx: number) => ({
              label: enumOpts.labels?.[idx] ?? val,
              value: String(val),
            }))
          }

          if (collection === "expanses" && col.name === "status_name" && segmentStatuses && segmentStatuses.length > 0) {
            selectOptions = segmentStatuses
          }

          let fieldTitle: string | undefined
          if (collection === "taxonomy" && (translations as any)?.taxonomy?.fields) {
            const taxonomyFields = (translations as any).taxonomy.fields
            const translationKey = col.name === "sort_order" ? "sortOrder" : col.name
            const fieldKey = translationKey as keyof typeof taxonomyFields
            fieldTitle = taxonomyFields[fieldKey]
          }

          const dataTableFieldTitle = (translations as any)?.dataTable?.fields?.[collection]?.[col.name] as string | undefined
          if (dataTableFieldTitle) {
            fieldTitle = dataTableFieldTitle
          }

          if (!fieldTitle && collection === "roles" && col.name === "xaid") {
            fieldTitle =
              (translations as any)?.dataTable?.fields?.roles?.xaid ?? "Expanse"
          }

          const defaultTitle = col.name.charAt(0).toUpperCase() + col.name.slice(1).replace(/_/g, " ")

          const inferredDbFieldType = inferFieldTypeFromDbType((col as any).type)
          const forcedFieldType =
            col.name === "data_in"
              ? "json"
              : (collection === "roles" && col.name === "title") ||
                  (collection === "expanses" && col.name === "title") ||
                  (collection === "contractors" && col.name === "title") ||
                  (collection === "taxonomy" && (col.name === "title" || col.name === "category"))
                ? "json"
                : undefined

          const forcedRelation: any =
            col.name === "xaid" && collection !== "expanses"
              ? {
                  collection: "expanses",
                  valueField: "xaid",
                  labelField: "title",
                }
              : undefined

          const isSystemFieldByName = ["deleted_at", "uuid"].includes(col.name)

          const shouldBeSelect = selectOptions && selectOptions.length > 0
          const shouldHideInTable =
            options.hiddenTable ||
            isSystemFieldByName ||
            col.name === "data_in" ||
            (collection === "roles" && col.name === "raid") ||
            (collection === "expanses" && col.name === "xaid") ||
            (collection === "contractors" && col.name === "xaid") ||
            (collection === "texts" && col.name === "category")
          const hideInTable = collection === "contractors" && col.name === "id" ? false : shouldHideInTable
          const isHidden = collection === "contractors" && col.name === "id" ? false : (options.hidden || false)

          const finalRelation = forcedRelation || options.relation

          if (collection === "contractors" && (col.name === "status_name" || col.name === "city_name")) {
            console.log(`[DataTable fetchData] Contractors field ${col.name}:`, {
              hasOptions: !!options,
              hasRelation: !!options.relation,
              relation: options.relation,
              finalRelation,
              forcedRelation,
              willBeInSchema: !isHidden && !hideInTable,
            })
          }

          return {
            ...col,
            title: fieldTitle || options.title || defaultTitle,
            hidden: isHidden,
            hiddenTable: hideInTable,
            readOnly: options.readOnly || false,
            required: options.required || fieldConfig?.required || false,
            virtual: options.virtual || false,
            fieldType: shouldBeSelect
              ? "select"
              : forcedFieldType || (options as any).fieldType || options.type || fieldConfig?.type || inferredDbFieldType,
            textarea: options.textarea || false,
            enum: options.enum,
            relation: finalRelation,
            selectOptions,
          }
        })

        // Add virtual fields from collection config that are not in DB schema
        const dbColumnNames = new Set(extendedColumns.map(col => col.name))
        for (const [fieldName, fieldColumn] of Object.entries(collectionConfig as any)) {
          const baseColumn = fieldColumn as BaseColumn | undefined
          if (!baseColumn) continue
          
          const options = baseColumn.options || {}
          // Only add virtual fields that start with data_in. and are not already in schema
          if (options.virtual && fieldName.startsWith('data_in.') && !dbColumnNames.has(fieldName)) {
            const fieldTitle = options.title || fieldName.replace('data_in.', '').replace(/([A-Z])/g, ' $1').trim()
            const dataTableFieldTitle = (translations as any)?.dataTable?.fields?.[collection]?.[fieldName] as string | undefined
            
            extendedColumns.push({
              name: fieldName,
              title: dataTableFieldTitle || fieldTitle,
              type: 'text', // Default type for virtual fields
              primary: false,
              nullable: !options.required,
              hidden: options.hidden || false,
              hiddenTable: options.hiddenTable || false,
              readOnly: options.readOnly || false,
              required: options.required || false,
              virtual: true,
              fieldType: (options as any).fieldType || options.type || 'text',
              textarea: options.textarea || false,
              enum: options.enum,
              relation: options.relation,
              selectOptions: (options as any).selectOptions,
            })
          }
        }

        const relationsToLoad = extendedColumns.filter((col) => col.relation)
        const relationDataMap: Record<string, Record<any, string>> = {}

        for (const col of relationsToLoad) {
          if (!col.relation) continue
          if (isMountedRef && !isMountedRef.current) break

          try {
            const valuesInUse = Array.from(
              new Set(
                (json.data || [])
                  .map((row: any) => row[col.name])
                  .filter((v: any) => v !== null && v !== undefined && v !== "")
              )
            )

            const relationFilters: AdminFilter[] = []
            if (Array.isArray(col.relation.filters)) {
              relationFilters.push(...col.relation.filters)
            }
            if (valuesInUse.length > 0) {
              relationFilters.push({ field: col.relation.valueField, op: "in", value: valuesInUse.join(",") })
            }

            const queryParams = qs.stringify({
              c: col.relation.collection,
              p: 1,
              ps: 1000,
              ...(col.relation.inheritSearch && search && { s: search }),
              ...(relationFilters.length > 0 && { filters: relationFilters }),
            })

            const relRes = await fetch(`/api/admin/state?${queryParams}`, {
              signal: abortSignal,
              credentials: "include",
            })

            if (isMountedRef && !isMountedRef.current) break

            if (relRes.ok) {
              const relJson: StateResponse = await relRes.json()
              const map: Record<any, string> = {}

              relJson.data.forEach((item) => {
                const value = item[col.relation!.valueField]
                let label: string

                if (col.relation!.collection === "taxonomy" && col.relation!.labelField === "title") {
                  let titleValue = item[col.relation!.labelField]

                  if (typeof titleValue === "string") {
                    try {
                      titleValue = JSON.parse(titleValue)
                    } catch {
                      // Not JSON, use as-is
                    }
                  }

                  if (titleValue && typeof titleValue === "object") {
                    label = titleValue[locale] || titleValue.en || titleValue.ru || titleValue.rs || titleValue.ar || "-"
                  } else {
                    label = String(titleValue || "-")
                  }
                } else {
                  label = col.relation!.labelFields
                    ? col.relation!.labelFields.map((f) => item[f]).filter(Boolean).join(" ")
                    : String(item[col.relation!.labelField] || "-")
                }
                map[value] = label
              })

              relationDataMap[col.name] = map
            }
          } catch (e) {
            if ((e as any)?.name !== "AbortError") {
              console.error(`Failed to load relation data for ${col.name}:`, e)
            }
          }
        }

        if (isMountedRef && !isMountedRef.current) return

        setRelationData(relationDataMap)

        setSchema(extendedColumns)
        if (!hasSearchOperators) {
          setTotal(json.schema.total)
          setTotalPages(json.schema.totalPages)
        }
        setData(json.data)
      } catch (e) {
        if (isMountedRef && !isMountedRef.current) return
        if ((e as any)?.name !== "AbortError") {
          const errorMessage = e instanceof Error ? e.message : String(e)
          setError(errorMessage)
          console.warn("[DataTable] Fetch warning:", errorMessage, e)
          // Reset lastFetchParamsRef on error to allow retry
          const hasSearchOperators = searchConditionsRef.current.some((c) => c.operator)
          const currentFetchKey = `${collection}-${page}-${hasSearchOperators ? "10000" : pageSize}-${search}-${filtersString}`
          if (lastFetchParamsRef.current === currentFetchKey) {
            lastFetchParamsRef.current = ""
          }
        }
      } finally {
        isFetchingRef.current = false
        if (!isMountedRef || isMountedRef.current) {
          setLoading(false)
        }
      }
    },
    [
      collection,
      page,
      pageSize,
      search,
      filters,
      locale,
      setState,
      taxonomyConfig,
      translations,
      segmentStatuses,
      searchConditionsRef,
      sortingRef,
      filtersString,
      setData,
      setSchema,
      setTotal,
      setTotalPages,
      setLoading,
      setError,
      setRelationData,
      isFetchingRef,
      lastFetchParamsRef,
    ]
  )

  return { fetchData }
}

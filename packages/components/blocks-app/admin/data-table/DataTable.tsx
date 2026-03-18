"use client"

import * as React from "react"
import { getCollection } from "@/shared/collections/getCollection"
import {  matchesSearchQuery } from "@/shared/utils/search-parser"
import { ru, enUS, sr } from "date-fns/locale"
import { LANGUAGES, } from "@/settings"
import { useMe } from "@/providers/MeProvider"

import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import qs from "qs"
import {
  Tabs,
  TabsContent,
} from "@/components/ui/tabs"
import { useAdminState } from "../../app-admin/AdminStateProvider"
import { useDeviceType } from "@/hooks/use-device-type"
import type {
  DataInEntry,
  SelectOption,
} from "./types"
import { generateColumns } from "./functions/generateColumns"
import { defaultT } from "./default-t"
import { useRouter } from 'next/navigation';
import { DataTableToolbar } from "./DataTableToolbar"
import { DataTableView } from "./DataTableView"
import { DataTablePagination } from "./DataTablePagination"
import { DataTableDeleteDialogs } from "./DataTableDeleteDialogs"
import { DataTableFormDialog } from "./DataTableFormDialog"
import { DataTableExportDialog } from "./DataTableExportDialog"
import { DataTableImportDialog } from "./DataTableImportDialog"
import { useDataTablePagination } from "./hooks/useDataTablePagination"
import { useDataTableSearchInput } from "./hooks/useDataTableSearchInput"
import { useDataTableColumnAlignment } from "./hooks/useDataTableColumnAlignment"
import { useDataTableColumnFilterValues } from "./hooks/useDataTableColumnFilterValues"
import { useDataTableShowFilterRow } from "./hooks/useDataTableShowFilterRow"
import { useDataTableColumnOrder } from "./hooks/useDataTableColumnOrder"
import { useDataTableFilterSettings } from "./hooks/useDataTableFilterSettings"
import { useDataTableCardViewSettings } from "./hooks/useDataTableCardViewSettings"
import { useDataTableColumnSizing } from "./hooks/useDataTableColumnSizing"
import { useDataTableColumnVisibility } from "./hooks/useDataTableColumnVisibility"
import { useDataTableReorderedColumns } from "./hooks/useDataTableReorderedColumns"
import {
  entriesToLanguageObject as entriesToLanguageObjectValue,
  entriesToObject as entriesToObjectValue,
  getTitleAndValueForLanguage as getTitleAndValueForLanguageValue,
  getUniqueBaseKeys as getUniqueBaseKeysValue,
  objectToEntries as objectToEntriesValue,
  updateTitleAndValueForLanguage as updateTitleAndValueForLanguageValue,
} from "./utils/dataInHelpers"
import { useDataTableDataState } from "./state/useDataTableDataState"
import { useDataTableMetaState } from "./state/useDataTableMetaState"
import { useDataTableFormState } from "./state/useDataTableFormState"
import { useDataTableFilterState } from "./state/useDataTableFilterState"
import { useDataTableImportState } from "./state/useDataTableImportState"
import { useDataTableExportState } from "./state/useDataTableExportState"
import { useDataTableEditingState } from "./state/useDataTableEditingState"
import { useDataTableDeleteState } from "./state/useDataTableDeleteState"
import { useDataTableTableState } from "./state/useDataTableTableState"
import { useDataTableFetchCallbacks } from "./callbacks/useDataTableFetchCallbacks"
import { useDataTableFilterCallbacks } from "./callbacks/useDataTableFilterCallbacks"
import { useDataTableFormCallbacks } from "./callbacks/useDataTableFormCallbacks"
import { useDataTableImportCallbacks } from "./callbacks/useDataTableImportCallbacks"
import { useDataTableExportCallbacks } from "./callbacks/useDataTableExportCallbacks"
import { useDataTableEditingCallbacks } from "./callbacks/useDataTableEditingCallbacks"
import { useDataTableDeleteCallbacks } from "./callbacks/useDataTableDeleteCallbacks"
import BaseCollection from "@/shared/collections/BaseCollection"


export function DataTable() {
  const { state, setState } = useAdminState()
  const { user } = useMe()
  const deviceType = useDeviceType()
  const columnSizesKey = React.useMemo(() => `column-sizes-${deviceType}-${state.collection}`, [deviceType, state.collection])
  const columnVisibiliteStateKey = `column-visibility-${deviceType}-${state.collection}`
  const router = useRouter()
  type LanguageCode = (typeof LANGUAGES)[number]["code"]

  // Get primary role from user
  const primaryRole = React.useMemo(() => {
    if (!user?.roles || user.roles.length === 0) return null
    return user.roles[0]?.name || null
  }, [user])

  // Data state
  const {
    data,
    setData,
    schema,
    setSchema,
    total,
    setTotal,
    totalPages,
    setTotalPages,
    loading,
    setLoading,
    error,
    setError,
    relationData,
    setRelationData,
  } = useDataTableDataState()

  // Meta state (translations, taxonomy, locale, segmentStatuses)
  const {
    locale,
    setLocale,
    translations,
    setTranslations,
    taxonomyConfig,
    setTaxonomyConfig,
    segmentStatuses,
    setSegmentStatuses,
    supportedLanguageCodes,
  } = useDataTableMetaState(state.collection)

  const { searchInput, setSearchInput } = useDataTableSearchInput({
    collection: state.collection,
    search: state.search,
    setState,
  })
  // Parsed search conditions with badges (only created on Enter press)
  // Table state (searchConditions, visibleColumns, sorting, isMobile)
  const {
    searchConditions,
    setSearchConditions,
    visibleColumns,
    setVisibleColumns,
    isMobile,
    setIsMobile,
    sorting,
    setSorting,
    defaultSorting,
    sortingKey,
  } = useDataTableTableState(state.collection)

  // Form state (create/edit dialogs, data_in, temp inputs, priceInputs)
  const {
    createOpen,
    setCreateOpen,
    formData,
    setFormData,
    createError,
    setCreateError,
    jsonFieldLanguage,
    setJsonFieldLanguage,
    createFormTab,
    setCreateFormTab,
    createDataInLanguage,
    setCreateDataInLanguage,
    createDataInEntries,
    setCreateDataInEntries,
    createDataInRaw,
    setCreateDataInRaw,
    createDataInRawError,
    setCreateDataInRawError,
    createKeyInputs,
    setCreateKeyInputs,
    createTitleInputs,
    setCreateTitleInputs,
    createValueInputs,
    setCreateValueInputs,
    editOpen,
    setEditOpen,
    editData,
    setEditData,
    editError,
    setEditError,
    recordToEdit,
    setRecordToEdit,
    isDuplicate,
    setIsDuplicate,
    editFormTab,
    setEditFormTab,
    editDataInLanguage,
    setEditDataInLanguage,
    editDataInEntries,
    setEditDataInEntries,
    editDataInRaw,
    setEditDataInRaw,
    editDataInRawError,
    setEditDataInRawError,
    editKeyInputs,
    setEditKeyInputs,
    editTitleInputs,
    setEditTitleInputs,
    editValueInputs,
    setEditValueInputs,
    priceInputs,
    setPriceInputs,
  } = useDataTableFormState(state.collection, locale, supportedLanguageCodes)

  // Sync visibleColumns with columnVisibility when changed
  React.useEffect(() => {
    if (visibleColumns.size > 0) {
      const newVisibility: VisibilityState = {}
      // Set all columns to hidden first
      schema.forEach(col => {
        if (!col.primary && col.name !== 'data_in') {
          newVisibility[col.name] = visibleColumns.has(col.name)
        }
      })
      // Handle data_in columns
      const allDataInKeys = new Set<string>()
      createDataInEntries.forEach(e => {
        const langMatch = e.key.match(/^(.+)_([a-z]{2})$/i)
        if (langMatch) {
          allDataInKeys.add(langMatch[1])
        } else {
          allDataInKeys.add(e.key)
        }
      })
      editDataInEntries.forEach(e => {
        const langMatch = e.key.match(/^(.+)_([a-z]{2})$/i)
        if (langMatch) {
          allDataInKeys.add(langMatch[1])
        } else {
          allDataInKeys.add(e.key)
        }
      })
      allDataInKeys.forEach(key => {
        newVisibility[`data_in.${key}`] = visibleColumns.has(`data_in.${key}`)
      })
      setColumnVisibility(newVisibility)
    }
  }, [visibleColumns, schema, createDataInEntries, editDataInEntries])

  // Data_in helper functions
  const entriesToObject = React.useCallback((entries: DataInEntry[]) => entriesToObjectValue(entries), [])
  const entriesToLanguageObject = React.useCallback(
    (entries: DataInEntry[]) => entriesToLanguageObjectValue(entries, supportedLanguageCodes),
    [supportedLanguageCodes]
  )
  const objectToEntries = React.useCallback((obj: any) => objectToEntriesValue(obj), [])
  // Helper function to get unique base keys from entries (without language suffix)
  const getUniqueBaseKeys = React.useCallback(
    (entries: DataInEntry[]): string[] => getUniqueBaseKeysValue(entries, supportedLanguageCodes),
    [supportedLanguageCodes]
  )
  // Helper function to get title and value for a specific language from entries
  const getTitleAndValueForLanguage = React.useCallback(
    (entries: DataInEntry[], baseKey: string, lang: LanguageCode): { title: string; value: string } =>
      getTitleAndValueForLanguageValue(entries, baseKey, lang),
    []
  )
  // Helper function to update title and value for a specific language in entries
  const updateTitleAndValueForLanguage = React.useCallback(
    (
      entries: DataInEntry[],
      baseKey: string,
      lang: LanguageCode,
      title: string,
      value: string,
      duplicateToAll: boolean = false
    ): DataInEntry[] =>
      updateTitleAndValueForLanguageValue(entries, baseKey, lang, title, value, supportedLanguageCodes, duplicateToAll),
    [supportedLanguageCodes]
  )


  const t = React.useMemo(() => {
    const dataTableTranslations = (translations as any)?.dataTable
    if (!dataTableTranslations) {
      console.warn('[DataTable] Using fallback translations, translations not loaded yet')
    }
    return dataTableTranslations || defaultT
  }, [translations])

  const collectionToEntityKey = React.useCallback((collection: string): string => {
    const normalized = (collection || "").toLowerCase()
    const specialCases: Record<string, string> = {
      echelon_employees: "employee_echelon",
      product_variants: "product_variant",
      asset_variants: "asset_variant",
      text_variants: "text_variant",
      wallet_transactions: "wallet_transaction",
      base_moves: "base_move",
      base_move_routes: "base_move_route",
      message_threads: "message_thread",
      outreach_referrals: "outreach_referral",
      echelons: "employee_echelon",
      employee_timesheets: "employee_timesheet",
      employee_leaves: "employee_leave",
      journal_generations: "journal_generation",
      journal_connections: "journal_connection",
      user_sessions: "user_session",
      user_bans: "user_ban",
      user_verifications: "user_verification",
      role_permissions: "role_permission",
      roles: "role",
    }
    const mapped = specialCases[normalized] || normalized
    if (mapped.endsWith("ies")) return mapped.slice(0, -3) + "y"
    if (mapped.endsWith("es") && !mapped.endsWith("ses")) return mapped.slice(0, -2)
    if (mapped.endsWith("s")) return mapped.slice(0, -1)
    return mapped
  }, [])

  // Get collection config early to access defaultSort and title
  const collectionConfig = React.useMemo(() => {
    return state.collection ? getCollection(state.collection) : null
  }, [state.collection])

  const collectionLabel = React.useMemo(() => {
    const collections = (translations as any)?.dataTable?.collections
    if (collections?.[state.collection]) return collections[state.collection]
    const entityOptions = (translations as any)?.taxonomy?.entityOptions || {}
    const key = collectionToEntityKey(state.collection)
    if (entityOptions[key]) return entityOptions[key]
    if (collectionConfig && (collectionConfig as any).__title) return (collectionConfig as any).__title
    return state.collection
  }, [state.collection, translations, collectionToEntityKey, collectionConfig])



  const primaryKey = React.useMemo(() => schema.find((c) => c.primary)?.name || "id", [schema])

  // Memoize filters string to prevent unnecessary re-renders
  const filtersString = React.useMemo(() => JSON.stringify(state.filters), [state.filters])

  // Use ref for searchConditions to avoid dependency issues
  const searchConditionsRef = React.useRef(searchConditions)
  React.useEffect(() => {
    searchConditionsRef.current = searchConditions
  }, [searchConditions])

  // Use ref for sorting to avoid dependency issues (sorting is declared later)
  const sortingRef = React.useRef<SortingState>([])

  // Track fetching state to prevent concurrent requests
  const isFetchingRef = React.useRef(false)

  // Update schema when segmentStatuses change for expanses (to update selectOptions and fieldType)
  const segmentStatusesStrRef = React.useRef<string>('')

  React.useEffect(() => {
    if (state.collection === 'expanses') {
      const currentStatusesStr = JSON.stringify(segmentStatuses)

      // Check if segmentStatuses actually changed
      if (currentStatusesStr === segmentStatusesStrRef.current) {
        return // No change, skip update
      }

      segmentStatusesStrRef.current = currentStatusesStr

      // Update schema with new selectOptions for status_name and ensure title is json
      setSchema((prevSchema) => {
        if (prevSchema.length === 0) return prevSchema

        const updatedSchema = prevSchema.map((col) => {
          if (col.name === 'status_name' && segmentStatuses.length > 0) {
            return {
              ...col,
              selectOptions: segmentStatuses,
              fieldType: 'select' as const,
            }
          }
          // Also ensure title has fieldType: 'json' for expanses
          if (col.name === 'title' && col.fieldType !== 'json') {
            return {
              ...col,
              fieldType: 'json' as const,
            }
          }
          return col
        })

        // Only update if something changed
        const hasChanges = updatedSchema.some((col, index) => {
          const oldCol = prevSchema[index]
          return col.fieldType !== oldCol.fieldType ||
            JSON.stringify(col.selectOptions) !== JSON.stringify(oldCol.selectOptions)
        })

        return hasChanges ? updatedSchema : prevSchema
      })
    }
  }, [segmentStatuses, state.collection, setSchema])

  // Track last fetch parameters to prevent unnecessary refetches
  const lastFetchParamsRef = React.useRef<string>('')

  // Fetch callbacks
  const { fetchData } = useDataTableFetchCallbacks({
    collection: state.collection,
    page: state.page,
    pageSize: state.pageSize,
    search: state.search,
    filters: state.filters,
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
  })

  const fetchDataRef = React.useRef(fetchData)

  // Keep fetchDataRef in sync
  React.useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])

  // Reset fetching state on collection change to prevent stuck state
  React.useEffect(() => {
    isFetchingRef.current = false
    lastFetchParamsRef.current = ''
  }, [state.collection])

  React.useEffect(() => {
    // Don't fetch if collection is not set
    if (!state.collection) {
      //console.log('[DataTable] Skipping fetch: no collection')
      return
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      //console.log('[DataTable] Skipping fetch: already fetching')
      return
    }

    const controller = new AbortController()
    const isMounted = { current: true }

    // Create a key for current fetch parameters
    const hasSearchOperators = searchConditionsRef.current.some(c => c.operator)
    const currentSortingString = sortingRef.current.length > 0
      ? sortingRef.current.map(s => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(',')
      : ''
    const fetchKey = `${state.collection}-${state.page}-${hasSearchOperators ? '10000' : state.pageSize}-${state.search}-${filtersString}-${currentSortingString}-${locale}`

    // Skip if parameters haven't changed
    if (lastFetchParamsRef.current === fetchKey && lastFetchParamsRef.current !== '') {
      //console.log('[DataTable] Skipping fetch: parameters unchanged', { fetchKey, lastFetch: lastFetchParamsRef.current })
      return
    }

    lastFetchParamsRef.current = fetchKey
    isFetchingRef.current = true

    // Use ref to avoid dependency on fetchData
    fetchDataRef.current(controller.signal, isMounted)
      .then(() => {
      })
      .catch((e) => {
        // Silently ignore AbortError
        if (e?.name !== "AbortError" && isMounted.current) {
          console.error('[DataTable] Failed to fetch data:', e)
          // Reset lastFetchParamsRef on error to allow retry
          if (lastFetchParamsRef.current === fetchKey) {
            lastFetchParamsRef.current = ''
          }
        }
      })
      .finally(() => {
        isFetchingRef.current = false
      })

    return () => {
      isMounted.current = false
      // Don't call abort() - let requests complete naturally
      // Results will be ignored due to isMounted check
      // This prevents AbortError from being thrown
    }
  }, [state.collection, state.page, state.pageSize, state.search, filtersString, locale])

  const {
    pagination,
    setPagination,
    defaultPageSize,
    setDefaultPageSize,
  } = useDataTablePagination({
    collection: state.collection,
    page: state.page,
    pageSize: state.pageSize,
    setState,
  })

  const { columnVisibility, setColumnVisibility } = useDataTableColumnVisibility(
    state.collection,
    primaryRole,
    columnVisibiliteStateKey
  )

  // Filter state
  const {
    columnFilters,
    setColumnFilters,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    statusOptions,
    setStatusOptions,
    cityFilter,
    setCityFilter,
    cityOptions,
    setCityOptions,
    tempSingleDate,
    setTempSingleDate,
    tempDateRange,
    setTempDateRange,
  } = useDataTableFilterState(state.collection)

  // Get locale for date-fns
  const dateFnsLocale = React.useMemo(() => {
    const loc = locale as string
    if (loc === 'ru') return ru
    if (loc === 'rs') return sr
    return enUS
  }, [locale])

  // Column sizing settings - separate for mobile and desktop
  const { columnSizing, setColumnSizing } = useDataTableColumnSizing(
    state.collection,
    columnSizesKey
  )
  const [batchUpdating, setBatchUpdating] = React.useState(false)
  const [batchRelationOptions, setBatchRelationOptions] = React.useState<Record<string, SelectOption[]>>({})
  const { columnAlignment, setColumnAlignment } = useDataTableColumnAlignment(state.collection)

  const { columnOrder, setColumnOrder } = useDataTableColumnOrder(state.collection)

  const { columnFilterValues, setColumnFilterValues } = useDataTableColumnFilterValues(state.collection)


  // Filter callbacks
  const {
    getDateRange,
    applyDateFilter,
    clearDateFilter,
    applyStatusFilter,
    clearStatusFilter,
    applyCityFilter,
    clearCityFilter,
  } = useDataTableFilterCallbacks({
    collection: state.collection,
    locale,
    setDateFilter,
    setTempSingleDate,
    setTempDateRange,
    setColumnFilters,
    setStatusFilter,
    setCityFilter,
    setStatusOptions,
    setCityOptions,
  })
  
  const { showFilterRow, setShowFilterRow } = useDataTableShowFilterRow(state.collection)
  const { filterSettings, setFilterSettings } = useDataTableFilterSettings(state.collection)

  // Editing state (editMode, editedCells, rowSelection)
  const { editMode, setEditMode, editedCells, setEditedCells, rowSelection, setRowSelection, hasUnsavedChanges } =
    useDataTableEditingState(state.collection)
  const editedCellsRef = React.useRef(editedCells)
  editedCellsRef.current = editedCells
  const getEditedCellValue = React.useCallback((rowIdStr: string, fieldName: string) => {
    return editedCellsRef.current.get(rowIdStr)?.[fieldName]
  }, [])
  const {
    cardViewModeMobile,
    setCardViewModeMobile,
    cardViewModeDesktop,
    setCardViewModeDesktop,
    cardsPerRow,
    setCardsPerRow,
  } = useDataTableCardViewSettings(state.collection)


  // Reload data when search conditions with operators change (need all data for client-side filtering)
  React.useEffect(() => {
    const hasOperators = searchConditions.some(c => c.operator)
    if (hasOperators && searchConditions.length > 0) {
      const controller = new AbortController()
      const isMounted = { current: true }
      // Use ref to avoid dependency on fetchData
      void fetchDataRef.current(controller.signal, isMounted)
    }
  }, [searchConditions])

  // Update sortingRef when sorting changes
  React.useEffect(() => {
    sortingRef.current = sorting
  }, [sorting])

  // Create string representation of sorting for fetchKey
  const sortingString = React.useMemo(() => {
    if (!sorting || sorting.length === 0) return ''
    return sorting.map(s => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(',')
  }, [sorting])

  // Fetch data when sorting changes
  React.useEffect(() => {
    // Don't fetch if collection is not set
    if (!state.collection) {
      return
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return
    }

    const controller = new AbortController()
    const isMounted = { current: true }

    // Create a key for current fetch parameters
    const hasSearchOperators = searchConditionsRef.current.some(c => c.operator)
    const currentSortingString = sorting.length > 0
      ? sorting.map(s => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(',')
      : ''
    const fetchKey = `${state.collection}-${state.page}-${hasSearchOperators ? '10000' : state.pageSize}-${state.search}-${filtersString}-${currentSortingString}-${locale}`

    // Skip if parameters haven't changed
    if (lastFetchParamsRef.current === fetchKey && lastFetchParamsRef.current !== '') {
      return
    }

    lastFetchParamsRef.current = fetchKey
    isFetchingRef.current = true

    // Use ref to avoid dependency on fetchData
    fetchDataRef.current(controller.signal, isMounted)
      .then(() => {
      })
      .catch((e) => {
        // Silently ignore AbortError
        if (e?.name !== "AbortError" && isMounted.current) {
          console.error('[DataTable] Failed to fetch data:', e)
          // Reset lastFetchParamsRef on error to allow retry
          if (lastFetchParamsRef.current === fetchKey) {
            lastFetchParamsRef.current = ''
          }
        }
      })
      .finally(() => {
        isFetchingRef.current = false
      })

    return () => {
      isMounted.current = false
    }
  }, [sortingString, state.collection, state.page, state.pageSize, state.search, filtersString, locale])

  // Delete state
  const { confirmOpen, setConfirmOpen, recordToDelete, setRecordToDelete, batchDeleteOpen, setBatchDeleteOpen, batchDeleting, setBatchDeleting } =
    useDataTableDeleteState()

  // Export state
  const { exportOpen, setExportOpen, exportFormat, setExportFormat, exportData, setExportData, exportCopied, setExportCopied } =
    useDataTableExportState()

  // Import state
  const {
    importOpen,
    setImportOpen,
    importFormat,
    setImportFormat,
    importFile,
    setImportFile,
    importText,
    setImportText,
    importMode,
    setImportMode,
    importProgress,
    setImportProgress,
    importResult,
    setImportResult,
    importing,
    setImporting,
  } = useDataTableImportState()

  // Fields to skip (auto-generated): id, uuid, {x}aid (but not relation fields), created_at, updated_at, deleted_at
  const isAutoGeneratedField = React.useCallback((fieldName: string, hasRelation?: boolean): boolean => {
    const lower = fieldName.toLowerCase()
    return (
      lower === "id" ||
      lower === "uuid" ||
      (lower.endsWith("aid") && !hasRelation && lower !== "raid") ||
      lower === "created_at" ||
      lower === "updated_at" ||
      lower === "deleted_at" ||
      false
    )
  }, [])

  const editableFields = React.useMemo(
    () => {
      const filtered = schema.filter((col) => {
        // For relation fields, allow them even if primary (they might be marked as primary in DB schema)
        const isRelationField = !!col.relation
        const shouldInclude = !isAutoGeneratedField(col.name, isRelationField) && (!col.primary || isRelationField) && !col.hidden
        
        // Debug log for goals virtual fields
        if (state.collection === 'goals' && col.name.startsWith('data_in.')) {
          console.log(`[DataTable editableFields] Virtual field ${col.name}:`, {
            virtual: col.virtual,
            hidden: col.hidden,
            isPrimary: col.primary,
            isAutoGenerated: isAutoGeneratedField(col.name, isRelationField),
            shouldInclude,
          })
        }
        
        return shouldInclude
      })
      
      // Debug: log all virtual fields for goals collection
      if (state.collection === 'goals') {
        const virtualFields = schema.filter(col => col.name.startsWith('data_in.') && col.virtual)
        console.log(`[DataTable editableFields] All virtual fields for goals:`, virtualFields.map(f => ({
          name: f.name,
          hidden: f.hidden,
          virtual: f.virtual,
          inEditableFields: filtered.some(ef => ef.name === f.name)
        })))
      }
      
      return filtered
    },
    [schema, isAutoGeneratedField, state.collection]
  )



  const enabledLanguageCodes = supportedLanguageCodes

  const getI18nJsonFieldsForCollection = React.useCallback((collection: string): string[] => {
    if (collection === 'taxonomy') return ['title', 'category']
    if (collection === 'roles') return ['title']
    if (collection === 'expanses') return ['title']
    if (collection === 'contractors') return ['title']
    if (collection === 'texts') return ['title', 'content', 'data_in.seo_title', 'data_in.seo_description', 'data_in.seo_keywords', 'data_in.slug']
    return []
  }, [])

  // Form callbacks
  const {
    handleFieldChange,
    handleEditFieldChange,
    onEditRequest,
    onDuplicateRequest,
    handleCreateSubmit,
    handleEditSubmit,
  } = useDataTableFormCallbacks({
    collection: state.collection,
    locale,
    enabledLanguageCodes,
    schema,
    primaryKey,
    editData,
    recordToEdit,
    isDuplicate,
    setEditData,
    setEditError,
    setEditOpen,
    setRecordToEdit,
    setIsDuplicate,
    setPriceInputs,
    setJsonFieldLanguage,
    isAutoGeneratedField,
    getI18nJsonFieldsForCollection,
    formData,
    setFormData,
    setCreateError,
    setCreateOpen,
    createDataInEntries,
    editDataInEntries,
    entriesToLanguageObject,
    editableFields,
    fetchData: async () => {
      const controller = new AbortController()
      const isMounted = { current: true }
      await fetchData(controller.signal, isMounted)
    },
  })

  // Create dialog keep after
  // Generate columns dynamically

  // Editing callbacks (needed for handleCellUpdate in columns)
  const { handleCellUpdate: handleCellUpdateForColumns } = useDataTableEditingCallbacks({
    schema,
    collection: state.collection,
    editedCells,
    setEditedCells,
    fetchData: async () => {
      const controller = new AbortController()
      const isMounted = { current: true }
      await fetchData(controller.signal, isMounted)
    },
    recordToEdit,
    table: null as any, // Will be set after table is created
    primaryKey,
    onEditRequest,
  })

  const { onDeleteRequest: onDeleteRequestForColumns } = useDataTableDeleteCallbacks({
    collection: state.collection,
    primaryKey,
    recordToDelete,
    setConfirmOpen,
    setRecordToDelete,
    setBatchDeleteOpen,
    setBatchDeleting,
    setError,
    setRowSelection,
    fetchData: async () => {
      const controller = new AbortController()
      const isMounted = { current: true }
      await fetchData(controller.signal, isMounted)
    },
    table: null as any,
  })

  const columns = React.useMemo(
    () =>
      schema.length > 0
        ? generateColumns(
            schema,
            onDeleteRequestForColumns,
            onEditRequest,
            onDuplicateRequest,
            locale,
            relationData,
            t,
            state.collection,
            data,
            columnVisibility,
            columnAlignment,
            columnSizing,
            editMode,
            handleCellUpdateForColumns,
            schema,
            getEditedCellValue,
            segmentStatuses
          )
        : [],
    [
      schema,
      onDeleteRequestForColumns,
      onEditRequest,
      onDuplicateRequest,
      locale,
      relationData,
      t,
      state.collection,
      data,
      columnVisibility,
      columnAlignment,
      columnSizing,
      editMode,
      handleCellUpdateForColumns,
      getEditedCellValue,
      segmentStatuses,
    ]
  )

  // Parse search query for client-side filtering with operators
  const parsedSearchQuery = React.useMemo(() => {
    if (searchConditions.length > 0) {
      return { conditions: searchConditions, defaultOperator: 'OR' as const }
    }
    return null
  }, [searchConditions])

  // Check if we need client-side filtering (when search has operators)
  const needsClientSideFilter = React.useMemo(() => {
    return parsedSearchQuery && parsedSearchQuery.conditions.some(c => c.operator)
  }, [parsedSearchQuery])

  // Filter data client-side if search has operators (server doesn't support them)
  const filteredData = React.useMemo(() => {
    let result = data

    // Apply date filters
    if (dateFilter.type && dateFilter.range) {
      const filterType = dateFilter.type
      const dateRange = dateFilter.range === 'custom' && dateFilter.customStart && dateFilter.customEnd
        ? { start: dateFilter.customStart, end: dateFilter.customEnd }
        : getDateRange(dateFilter.range as any)

      result = result.filter((row) => {
        const cellValue = row[filterType] as string | null | undefined
        if (!cellValue) return false
        const cellDate = new Date(cellValue)
        return cellDate >= dateRange.start && cellDate <= dateRange.end
      })
    }

    if (!needsClientSideFilter || !parsedSearchQuery) {
      return result
    }

    // Has operators - filter client-side
    const filtered = result.filter((row) => {
      // Search across all text fields in the row
      const searchableText = Object.values(row)
        .filter(v => v != null)
        .map(v => {
          if (typeof v === 'string') return v
          if (typeof v === 'number') return String(v)
          if (typeof v === 'boolean') return String(v)
          if (typeof v === 'object') {
            try {
              return JSON.stringify(v)
            } catch {
              return ''
            }
          }
          return ''
        })
        .join(' ')

      const matches = matchesSearchQuery(searchableText.toLowerCase(), parsedSearchQuery, false)
      return matches
    })

    // Update total when filtering client-side
    if (filtered.length !== total) {
      setTotal(filtered.length)
      setTotalPages(Math.max(1, Math.ceil(filtered.length / pagination.pageSize)))
    }

    return filtered
  }, [data, parsedSearchQuery, needsClientSideFilter, total, pagination.pageSize, dateFilter, statusFilter, cityFilter, getDateRange])
  
  // Update total when status or city filters are applied (client-side filtering)
  React.useEffect(() => {
    if (statusFilter.length > 0 || cityFilter.length > 0 || (dateFilter.type && dateFilter.range)) {
      const filteredLength = filteredData.length
      if (filteredLength !== total) {
        setTotal(filteredLength)
        setTotalPages(Math.max(1, Math.ceil(filteredLength / pagination.pageSize)))
      }
    }
  }, [statusFilter, cityFilter, dateFilter, filteredData.length, total, pagination.pageSize])

  // isMobile is already in useDataTableTableState

  const reorderedColumns = useDataTableReorderedColumns({
    columns,
    columnOrder,
    isMobile,
    collection: state.collection,
  })

  // Filter sorting to only include columns that exist in the table
  const filteredSorting = React.useMemo(() => {
    if (!reorderedColumns || reorderedColumns.length === 0) {
      return sorting // Return original sorting if columns not ready yet
    }
    const columnIds = new Set(reorderedColumns.map(col => col.id).filter(Boolean))
    return sorting.filter(s => columnIds.has(s.id))
  }, [sorting, reorderedColumns])

  // Update sorting if it was filtered (remove non-existent columns) - only when collection or columns change
  const columnsKey = React.useMemo(() => {
    if (!reorderedColumns || reorderedColumns.length === 0) return ''
    return reorderedColumns.map(col => col.id).filter(Boolean).sort().join(',')
  }, [reorderedColumns])
  
  const reorderedColumnsRef = React.useRef(reorderedColumns)
  React.useEffect(() => {
    reorderedColumnsRef.current = reorderedColumns
  }, [reorderedColumns])
  
  const prevCollectionRef = React.useRef(state.collection)
  const prevColumnsRef = React.useRef<string>('')
  const setSortingRef = React.useRef(setSorting)
  React.useEffect(() => {
    setSortingRef.current = setSorting
  }, [setSorting])
  
  React.useEffect(() => {
    const currentColumns = reorderedColumnsRef.current
    if (!currentColumns || currentColumns.length === 0) return
    
    const collectionChanged = prevCollectionRef.current !== state.collection
    const columnsChanged = prevColumnsRef.current !== columnsKey
    
    if (collectionChanged || columnsChanged) {
      const columnIds = new Set(currentColumns.map(col => col.id).filter(Boolean))
      setSortingRef.current((currentSorting) => {
        const hasInvalidColumns = currentSorting.some(s => !columnIds.has(s.id))
        if (hasInvalidColumns) {
          return currentSorting.filter(s => columnIds.has(s.id))
        }
        return currentSorting
      })
      
      prevCollectionRef.current = state.collection
      prevColumnsRef.current = columnsKey
    }
  }, [state.collection, columnsKey])
  
  // Column settings logic moved to DataTableColumnSettings

  const table = useReactTable({
    data: filteredData,
    columns: reorderedColumns,
    manualSorting: true,
    state: {
      sorting: filteredSorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      columnSizing,
    },
    pageCount: totalPages,
    manualPagination: true,
    enableRowSelection: true,
    enableMultiSort: true, // Enable multi-column sorting
    columnResizeMode: 'onChange',
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const getBatchFieldOptions = React.useCallback((fieldName: string): SelectOption[] => {
    const field = schema.find((f) => f.name === fieldName)
    if (!field) return []

    if (field.fieldType === "select" && field.selectOptions) {
      return field.selectOptions.map((opt) => ({ value: String(opt.value), label: opt.label }))
    }
    if (field.fieldType === "enum" && field.enum) {
      return field.enum.values.map((value, idx) => ({
        value: String(value),
        label: field.enum?.labels[idx] || String(value),
      }))
    }
    if (field.relation && relationData[fieldName]) {
      return Object.entries(relationData[fieldName]).map(([value, label]) => ({
        value: String(value),
        label: String(label),
      }))
    }

    const uniqueValues = Array.from(
      new Set(
        data
          .map((row) => row?.[fieldName])
          .filter((value) => value !== null && value !== undefined && value !== "")
          .map((value) => String(value))
      )
    )
    return uniqueValues.map((value) => ({ value, label: value }))
  }, [schema, data, relationData])

  const batchStatusFieldName = React.useMemo(() => {
    if (schema.some((f) => f.name === "status_name")) return "status_name"
    if (schema.some((f) => f.name === "status")) return "status"
    return undefined
  }, [schema])

  const batchTypeFieldName = React.useMemo(() => {
    if (schema.some((f) => f.name === "type")) return "type"
    return undefined
  }, [schema])

  const batchStatusOptions = React.useMemo(() => {
    if (!batchStatusFieldName) return []
    return getBatchFieldOptions(batchStatusFieldName)
  }, [batchStatusFieldName, getBatchFieldOptions])

  const batchTypeOptions = React.useMemo(() => {
    if (!batchTypeFieldName) return []
    return getBatchFieldOptions(batchTypeFieldName)
  }, [batchTypeFieldName, getBatchFieldOptions])

  React.useEffect(() => {
    let isActive = true

    const loadRelationOptions = async () => {
      const targetFields = [batchStatusFieldName, batchTypeFieldName].filter(Boolean) as string[]
      if (targetFields.length === 0) {
        if (isActive) setBatchRelationOptions({})
        return
      }

      const nextOptions: Record<string, SelectOption[]> = {}

      for (const fieldName of targetFields) {
        const field = schema.find((f) => f.name === fieldName)
        if (!field?.relation) continue

        try {
          const relationFilters = Array.isArray(field.relation.filters) ? field.relation.filters : []
          const queryParams = qs.stringify({
            c: field.relation.collection,
            p: 1,
            ps: 1000,
            ...(relationFilters.length > 0 && { filters: relationFilters }),
          })

          const res = await fetch(`/api/admin/state?${queryParams}`, {
            credentials: "include",
          })
          if (!res.ok) continue

          const relJson = await res.json() as { data?: CollectionData[] }
          const list = (relJson.data || []).map((item) => {
            const value = item[field.relation!.valueField]
            let label: string

            if (field.relation!.collection === "taxonomy" && field.relation!.labelField === "title") {
              let titleValue: any = item[field.relation!.labelField]
              if (typeof titleValue === "string") {
                try {
                  titleValue = JSON.parse(titleValue)
                } catch {
                  // keep original string
                }
              }
              if (titleValue && typeof titleValue === "object") {
                label = titleValue[locale] || titleValue.en || titleValue.ru || titleValue.rs || titleValue.ar || "-"
              } else {
                label = String(titleValue || "-")
              }
            } else {
              label = field.relation!.labelFields
                ? field.relation!.labelFields.map((lf) => item[lf]).filter(Boolean).join(" ")
                : String(item[field.relation!.labelField] || "-")
            }

            return { value: String(value), label }
          })

          nextOptions[fieldName] = list
        } catch (e) {
          console.error(`[DataTable] Failed to load batch options for ${fieldName}:`, e)
        }
      }

      if (isActive) {
        setBatchRelationOptions(nextOptions)
      }
    }

    void loadRelationOptions()

    return () => {
      isActive = false
    }
  }, [batchStatusFieldName, batchTypeFieldName, schema, locale, state.collection])

  const effectiveBatchStatusOptions = React.useMemo(() => {
    if (!batchStatusFieldName) return []
    return batchRelationOptions[batchStatusFieldName]?.length
      ? batchRelationOptions[batchStatusFieldName]
      : batchStatusOptions
  }, [batchStatusFieldName, batchRelationOptions, batchStatusOptions])

  const effectiveBatchTypeOptions = React.useMemo(() => {
    if (!batchTypeFieldName) return []
    return batchRelationOptions[batchTypeFieldName]?.length
      ? batchRelationOptions[batchTypeFieldName]
      : batchTypeOptions
  }, [batchTypeFieldName, batchRelationOptions, batchTypeOptions])

  const getBatchFieldLabel = React.useCallback((fieldName?: string): string => {
    if (!fieldName) return ""
    const translated = (translations as any)?.dataTable?.fields?.[state.collection]?.[fieldName]
    if (translated) return String(translated)
    const fromSchema = schema.find((f) => f.name === fieldName)?.title
    if (fromSchema) return String(fromSchema)
    return fieldName
  }, [translations, state.collection, schema])

  const batchStatusLabel = React.useMemo(() => getBatchFieldLabel(batchStatusFieldName), [getBatchFieldLabel, batchStatusFieldName])
  const batchTypeLabel = React.useMemo(() => getBatchFieldLabel(batchTypeFieldName), [getBatchFieldLabel, batchTypeFieldName])

  const handleBatchUpdateSelected = React.useCallback(
    async (changes: Record<string, any>) => {
      if (!changes || Object.keys(changes).length === 0) return

      const selectedRows = table.getFilteredSelectedRowModel().rows
      if (selectedRows.length === 0) return

      setBatchUpdating(true)
      try {
        await Promise.all(
          selectedRows.map(async (row) => {
            const rowId = row.original[primaryKey]
            const res = await fetch(`/api/admin/${encodeURIComponent(state.collection)}/${encodeURIComponent(String(rowId))}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(changes),
            })
            if (!res.ok) {
              const json = await res.json() as { error?: string }
              throw new Error(json.error || `Update failed for row ${rowId}: ${res.status}`)
            }
          })
        )
        setRowSelection({})
        await fetchData()
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setBatchUpdating(false)
      }
    },
    [table, primaryKey, state.collection, fetchData, setError, setRowSelection]
  )

  // Update editing callbacks with table reference (for navigation)
  const editingCallbacksWithTable = useDataTableEditingCallbacks({
    schema,
    collection: state.collection,
    editedCells,
    setEditedCells,
    fetchData: async () => {
      const controller = new AbortController()
      const isMounted = { current: true }
      await fetchData(controller.signal, isMounted)
    },
    recordToEdit,
    table,
    primaryKey,
    onEditRequest,
  })

  // Use editing callbacks (handleCellUpdate is already set above, but we need the rest)
  const { handleSaveAllChanges, currentRowIndex, hasPreviousRecord, hasNextRecord, navigateToPrevious, navigateToNext } = editingCallbacksWithTable

  // Delete callbacks
  const { handleConfirmDelete: handleConfirmDeleteCallback, handleBatchDelete } = useDataTableDeleteCallbacks({
    collection: state.collection,
    primaryKey,
    recordToDelete,
    setConfirmOpen,
    setRecordToDelete,
    setBatchDeleteOpen,
    setBatchDeleting,
    setError,
    setRowSelection,
    fetchData: async () => {
      const controller = new AbortController()
      const isMounted = { current: true }
      await fetchData(controller.signal, isMounted)
    },
    table,
  })

  const handleConfirmDelete = React.useCallback(async () => {
    await handleConfirmDeleteCallback(recordToDelete)
  }, [handleConfirmDeleteCallback, recordToDelete])

  // Export callbacks
  const { handleExport, handleExportCopy, handleExportDownload } = useDataTableExportCallbacks({
    collection: state.collection,
    table,
    schema,
    columnVisibility,
    locale,
    relationData,
    translations,
    exportData,
    exportFormat,
    setExportData,
    setExportFormat,
    setExportOpen,
    setExportCopied,
  })

  // Import callbacks
  const { handleImportFileSelect, handleImport, handleImportClose, handleImportDialogChange } = useDataTableImportCallbacks({
    collection: state.collection,
    importFile,
    importText,
    importMode,
    importFormat,
    setImporting,
    setImportProgress,
    setImportResult,
    setImportOpen,
    setImportFile,
    setImportText,
    setImportMode,
    setImportFormat,
    fetchData: async () => {
      const controller = new AbortController()
      const isMounted = { current: true }
      await fetchData(controller.signal, isMounted)
    },
    t,
  })

  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <DataTableToolbar
        t={t}
        dateFilter={dateFilter}
        tempSingleDate={tempSingleDate}
        setTempSingleDate={setTempSingleDate}
        tempDateRange={tempDateRange}
        setTempDateRange={setTempDateRange}
        dateFnsLocale={dateFnsLocale}
        applyDateFilter={applyDateFilter}
        clearDateFilter={clearDateFilter}
        searchValue={state.search}
        onSearchChange={(searchString) => {
          setState((prev) => {
            
            return ({ ...prev, search: searchString, page: 1 })
          })
        }}
        batchDeleting={batchDeleting}
        onBatchDelete={() => setBatchDeleteOpen(true)}
        handleExport={handleExport}
        onImportOpen={() => setImportOpen(true)}
        editMode={editMode}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveAllChanges={handleSaveAllChanges}
        columnSettingsProps={{
          table,
          data,
          schema,
          translations,
          t,
          locale,
          supportedLanguageCodes,
          collection: state.collection,
          columnOrder,
          setColumnOrder,
          columnVisibility,
          setColumnVisibility,
          sorting,
          setSorting,
          defaultSorting,
          columnSizing,
          setColumnSizing,
          columnAlignment,
          setColumnAlignment,
          defaultPageSize,
          setDefaultPageSize,
          setPagination,
          setState,
          editMode,
          setEditMode,
          isMobile,
          cardViewModeMobile,
          setCardViewModeMobile,
          cardViewModeDesktop,
          setCardViewModeDesktop,
          cardsPerRow,
          setCardsPerRow,
        }}
        batchStatusOptions={effectiveBatchStatusOptions}
        batchTypeOptions={effectiveBatchTypeOptions}
        onBatchUpdateSelected={handleBatchUpdateSelected}
        batchUpdating={batchUpdating}
        batchStatusFieldName={batchStatusFieldName}
        batchTypeFieldName={batchTypeFieldName}
        batchStatusLabel={batchStatusLabel}
        batchTypeLabel={batchTypeLabel}
        onCreateOpen={() => setCreateOpen(true)}
      />
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-0"
      >

        <DataTableView
          error={error}
          t={t}
          collectionLabel={collectionLabel}
          isMobile={isMobile}
          cardViewModeMobile={cardViewModeMobile}
          cardViewModeDesktop={cardViewModeDesktop}
          cardsPerRow={cardsPerRow}
          table={table}
          onEditRequest={onEditRequest}
          schema={schema}
          translations={translations}
          locale={locale}
          collection={state.collection}
          showFilterRow={showFilterRow}
          columnFilterValues={columnFilterValues}
          setColumnFilterValues={setColumnFilterValues}
          setColumnFilters={setColumnFilters}
          columnsLength={columns.length}
          loading={loading}
          collectionConfig={collectionConfig}
        />
        {!error && (
          <>
            <DataTablePagination
              t={t}
              table={table}
              total={total}
              totalPages={totalPages}
              currentPage={state.page}
              setDefaultPageSize={setDefaultPageSize}
            />
          </>
        )}
      </TabsContent>

      <DataTableDeleteDialogs
        t={t}
        collectionLabel={collectionLabel}
        confirmOpen={confirmOpen}
        setConfirmOpen={setConfirmOpen}
        handleConfirmDelete={handleConfirmDelete}
        batchDeleteOpen={batchDeleteOpen}
        setBatchDeleteOpen={setBatchDeleteOpen}
        handleBatchDelete={handleBatchDelete}
        batchDeleting={batchDeleting}
        table={table}
      />
      <DataTableFormDialog
        t={t}
        collectionLabel={collectionLabel}
        collection={state.collection}
        search={state.search}
        locale={locale}
        translations={translations}
        enabledLanguageCodes={enabledLanguageCodes}
        supportedLanguageCodes={supportedLanguageCodes}
        editableFields={editableFields}
        schema={schema}
        isAutoGeneratedField={isAutoGeneratedField}
        getI18nJsonFieldsForCollection={getI18nJsonFieldsForCollection}
        formData={formData}
        setFormData={setFormData}
        handleFieldChange={handleFieldChange}
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        createError={createError}
        setCreateError={setCreateError}
        createFormTab={createFormTab}
        setCreateFormTab={setCreateFormTab}
        createDataInLanguage={createDataInLanguage}
        setCreateDataInLanguage={setCreateDataInLanguage}
        createDataInEntries={createDataInEntries}
        setCreateDataInEntries={setCreateDataInEntries}
        createDataInRaw={createDataInRaw}
        setCreateDataInRaw={setCreateDataInRaw}
        createDataInRawError={createDataInRawError}
        setCreateDataInRawError={setCreateDataInRawError}
        createKeyInputs={createKeyInputs}
        setCreateKeyInputs={setCreateKeyInputs}
        createTitleInputs={createTitleInputs}
        setCreateTitleInputs={setCreateTitleInputs}
        createValueInputs={createValueInputs}
        setCreateValueInputs={setCreateValueInputs}
        handleCreateSubmit={handleCreateSubmit}
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editData={editData}
        setEditData={setEditData}
        editError={editError}
        setEditError={setEditError}
        recordToEdit={recordToEdit}
        setRecordToEdit={setRecordToEdit}
        isDuplicate={isDuplicate}
        setIsDuplicate={setIsDuplicate}
        editFormTab={editFormTab}
        setEditFormTab={setEditFormTab}
        editDataInLanguage={editDataInLanguage}
        setEditDataInLanguage={setEditDataInLanguage}
        editDataInEntries={editDataInEntries}
        setEditDataInEntries={setEditDataInEntries}
        editDataInRaw={editDataInRaw}
        setEditDataInRaw={setEditDataInRaw}
        editDataInRawError={editDataInRawError}
        setEditDataInRawError={setEditDataInRawError}
        editKeyInputs={editKeyInputs}
        setEditKeyInputs={setEditKeyInputs}
        editTitleInputs={editTitleInputs}
        setEditTitleInputs={setEditTitleInputs}
        editValueInputs={editValueInputs}
        setEditValueInputs={setEditValueInputs}
        handleEditFieldChange={handleEditFieldChange}
        handleEditSubmit={handleEditSubmit}
        jsonFieldLanguage={jsonFieldLanguage}
        setJsonFieldLanguage={setJsonFieldLanguage}
        priceInputs={priceInputs}
        setPriceInputs={setPriceInputs}
        objectToEntries={objectToEntries}
        getUniqueBaseKeys={getUniqueBaseKeys}
        getTitleAndValueForLanguage={getTitleAndValueForLanguage}
        updateTitleAndValueForLanguage={updateTitleAndValueForLanguage}
      />

      <DataTableExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        t={t}
        table={table}
        exportFormat={exportFormat}
        exportData={exportData}
        exportCopied={exportCopied}
        onCopy={handleExportCopy}
        onDownload={handleExportDownload}
      />

      <DataTableImportDialog
        open={importOpen}
        onOpenChange={handleImportDialogChange}
        t={t}
        collection={state.collection}
        importFormat={importFormat}
        setImportFormat={setImportFormat}
        importMode={importMode}
        setImportMode={setImportMode}
        importFile={importFile}
        setImportFile={setImportFile}
        importText={importText}
        setImportText={setImportText}
        importing={importing}
        importProgress={importProgress}
        importResult={importResult}
        onFileSelect={handleImportFileSelect}
        onClose={handleImportClose}
        onImport={handleImport}
      />
    </Tabs>
  )
}

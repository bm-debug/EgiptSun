import * as React from "react"
import type { CollectionData, ColumnSchemaExtended } from "../types"

export function useDataTableDataState() {
  const [data, setData] = React.useState<CollectionData[]>([])
  const [schema, setSchema] = React.useState<ColumnSchemaExtended[]>([])
  const [total, setTotal] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [relationData, setRelationData] = React.useState<Record<string, Record<any, string>>>({})

  return {
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
  }
}

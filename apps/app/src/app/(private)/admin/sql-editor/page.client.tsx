"use client"

import * as React from "react"
import { AppSidebar } from "@/packages/components/blocks-app/admin/app-sidebar"
import { i18n } from "@/lib/i18n"
import { LANGUAGES } from "@/settings"
import { AdminHeader } from "@/packages/components/blocks-app/app-admin/AdminHeader"

function getAdminLocale(): string {
  if (typeof window === "undefined") return "en"
  const saved = localStorage.getItem("sidebar-locale")
  return saved && LANGUAGES.some((l) => l.code === saved) ? saved : "en"
}

function useSqlEditorTranslations() {
  const [t, setT] = React.useState<Record<string, string>>({})
  const [locale, setLocale] = React.useState("en")

  React.useEffect(() => {
    const loc = getAdminLocale()
    setLocale(loc)
    i18n.loadTranslations(loc).then((tr) => {
      const sql = (tr as any)?.sqlEditor
      setT((sql && typeof sql === "object") ? sql : {})
    })
    const handler = () => {
      const newLoc = getAdminLocale()
      setLocale(newLoc)
      i18n.loadTranslations(newLoc).then((tr) => {
        const sql = (tr as any)?.sqlEditor
        setT((sql && typeof sql === "object") ? sql : {})
      })
    }
    window.addEventListener("sidebar-locale-changed", handler)
    return () => window.removeEventListener("sidebar-locale-changed", handler)
  }, [])

  const get = (key: string, fallback: string) => t[key] ?? fallback
  return { get }
}
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Play, RotateCcw, CheckCircle2, XCircle, AlertCircle, Terminal } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

export default function SqlEditorPageClient() {
  const { get: t } = useSqlEditorTranslations()
  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<{
    data: any[]
    rowCount: number
    columns: string[]
    commandType?: "SELECT" | "INSERT" | "UPDATE" | "DELETE"
    tableName?: string | null
  } | null>(null)
  const [executionTime, setExecutionTime] = React.useState<number | null>(null)

  interface SqlExecuteResponse {
    success: boolean
    error?: string
    data?: any[]
    rowCount?: number
    columns?: string[]
    commandType?: "SELECT" | "INSERT" | "UPDATE" | "DELETE"
    tableName?: string | null
  }

  const handleExecute = async () => {
    if (!query.trim()) {
      setError(t("pleaseEnterQuery", "Please enter a SQL query"))
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setExecutionTime(null)

    const startTime = Date.now()

    try {
      const response = await fetch("/api/altrp/v1/admin/sql/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          query: query.trim(),
        }),
      })

      const endTime = Date.now()
      setExecutionTime(endTime - startTime)

      const data = (await response.json()) as SqlExecuteResponse & { hint?: string }

      if (!response.ok || !data.success) {
        const msg = data.error || t("failedToExecute", "Failed to execute query")
        const withHint = data.hint ? `${msg}. ${data.hint}` : msg
        throw new Error(withHint)
      }

      setResult({
        data: data.data || [],
        rowCount: data.rowCount ?? 0,
        columns: data.columns || [],
        commandType: data.commandType,
        tableName: data.tableName ?? null,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("failedToExecute", "Failed to execute query")
      setError(errorMessage)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setQuery("")
    setError(null)
    setResult(null)
    setExecutionTime(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleExecute()
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider resizable>
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <AdminHeader title={t("title", "SQL Editor")} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{t("title", "SQL Editor")}</h1>
                <p className="text-muted-foreground mt-2">
                  {t("description", "Execute SQL queries against the database. Only SELECT, INSERT, UPDATE, and DELETE queries are allowed.")}
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("error", "Error")}</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <span className="block">{error}</span>
                    {error.includes("invalid input syntax for type json") && query.includes("'NULL'") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setQuery((q) => q.replace(/'NULL'/g, "NULL"))
                          setError(null)
                        }}
                      >
                        {t("replaceNullWithNull", "Replace 'NULL' with NULL in query")}
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{t("query", "Query")}</CardTitle>
                      <CardDescription className="space-y-1">
                        <span className="block">{t("queryHint", "Enter your SQL query. Press Ctrl+Enter (Cmd+Enter on Mac) to execute.")}</span>
                        <span className="block text-amber-600 dark:text-amber-500">{t("jsonbHint", "For jsonb columns (e.g. taxonomy.data_in): use NULL without quotes, or valid JSON with ::jsonb.")}</span>
                        <details className="mt-2 text-muted-foreground">
                          <summary className="cursor-pointer font-medium">{t("exampleInsertTaxonomy", "Example: INSERT into taxonomy")}</summary>
                          <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto font-mono whitespace-pre">
{`INSERT INTO taxonomy (entity, name, title, data_in)
VALUES ('my_entity', 'my_name', 'My title', NULL);  -- data_in is jsonb: use NULL, not 'NULL'

-- Or with JSON:
INSERT INTO taxonomy (entity, name, title, data_in)
VALUES ('e', 'n', 'T', '{"key": "value"}'::jsonb);`}
                          </pre>
                        </details>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClear}
                        disabled={loading}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t("clear", "Clear")}
                      </Button>
                      <Button
                        onClick={handleExecute}
                        disabled={loading || !query.trim()}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("executing", "Executing...")}
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            {t("execute", "Execute")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("placeholder", "SELECT * FROM users LIMIT 10;")}
                    className="font-mono text-sm min-h-[200px]"
                    disabled={loading}
                  />
                </CardContent>
              </Card>

              {result && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{t("results", "Results")}</CardTitle>
                        <CardDescription>
                          {(() => {
                            const n = result.rowCount
                            const plural = n !== 1
                            const time = executionTime !== null ? ` • ${executionTime}ms` : ""
                            const tbl = result.tableName
                            const inT = tbl ? t("inTable", "in table {t}").replace("{t}", tbl) : ""
                            const fromT = tbl ? t("fromTable", "from table {t}").replace("{t}", tbl) : ""
                            switch (result.commandType) {
                              case "INSERT":
                                return (plural ? t("rowsInserted", "{n} rows inserted") : t("rowInserted", "{n} row inserted")).replace("{n}", String(n)) + (inT ? ` ${inT}` : "") + time
                              case "UPDATE":
                                return (plural ? t("rowsUpdated", "{n} rows updated") : t("rowUpdated", "{n} row updated")).replace("{n}", String(n)) + (inT ? ` ${inT}` : "") + time
                              case "DELETE":
                                return (plural ? t("rowsDeleted", "{n} rows deleted") : t("rowDeleted", "{n} row deleted")).replace("{n}", String(n)) + (fromT ? ` ${fromT}` : "") + time
                              default:
                                return (plural ? t("rowsReturned", "{n} rows returned") : t("rowReturned", "{n} row returned")).replace("{n}", String(n)) + time
                            }
                          })()}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t("success", "Success")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.commandType !== "SELECT" && result.data.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t("queryExecutedSuccessfully", "Query executed successfully.")}
                      </div>
                    ) : result.data.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t("noRowsReturned", "Query executed successfully but returned no rows.")}
                      </div>
                    ) : (
                      <ScrollArea className="w-full">
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {result.columns.map((column) => (
                                  <TableHead key={column} className="font-mono text-xs">
                                    {column}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {result.data.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                  {result.columns.map((column) => {
                                    const value = row[column]
                                    const displayValue =
                                      value === null || value === undefined
                                        ? (
                                            <span className="text-muted-foreground italic">NULL</span>
                                          )
                                        : typeof value === "object"
                                          ? JSON.stringify(value)
                                          : String(value)
                                    return (
                                      <TableCell
                                        key={column}
                                        className="font-mono text-xs max-w-[300px] break-all"
                                      >
                                        {displayValue}
                                      </TableCell>
                                    )
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              )}

              {!result && !loading && !error && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("enterQueryAndExecute", "Enter a SQL query above and click Execute to see results.")}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}


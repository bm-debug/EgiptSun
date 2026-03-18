import { NextRequest, NextResponse } from "next/server"
import { withAdminGuard, type AuthenticatedRequestContext } from "@/shared/api-guard"
import { createDb, getPostgresClient } from "@/shared/repositories/utils"
import postgres from "postgres"

type CommandType = "SELECT" | "INSERT" | "UPDATE" | "DELETE"

function getCommandType(upperQuery: string): CommandType {
  if (upperQuery.startsWith("WITH ")) return "SELECT"
  if (upperQuery.startsWith("SELECT ")) return "SELECT"
  if (upperQuery.startsWith("INSERT ")) return "INSERT"
  if (upperQuery.startsWith("UPDATE ")) return "UPDATE"
  if (upperQuery.startsWith("DELETE ")) return "DELETE"
  return "SELECT"
}

function parseTableName(trimmedQuery: string, commandType: CommandType): string | null {
  const parts = trimmedQuery.replace(/\s+/g, " ").trim().split(" ")
  try {
    if (commandType === "INSERT") {
      const intoIdx = parts.findIndex((p) => p.toUpperCase() === "INTO")
      if (intoIdx >= 0 && parts[intoIdx + 1]) {
        const name = parts[intoIdx + 1]
        return name.replace(/^["']|["']$/g, "")
      }
    }
    if (commandType === "UPDATE" && parts[1]) {
      return parts[1].replace(/^["']|["']$/g, "")
    }
    if (commandType === "DELETE") {
      const fromIdx = parts.findIndex((p) => p.toUpperCase() === "FROM")
      if (fromIdx >= 0 && parts[fromIdx + 1]) {
        return parts[fromIdx + 1].replace(/^["']|["']$/g, "")
      }
    }
  } catch {
    // ignore
  }
  return null
}

const handlePost = async (
  context: AuthenticatedRequestContext,
  request: NextRequest
): Promise<Response> => {
  try {
    const body = await request.json()
    const { query, params = [] } = body as { query: string; params?: any[] }

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Query is required",
        },
        { status: 400 }
      )
    }

    // Trim and validate query
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return NextResponse.json(
        {
          success: false,
          error: "Query cannot be empty",
        },
        { status: 400 }
      )
    }

    // Security: Only allow SELECT, INSERT, UPDATE, DELETE queries
    // Block dangerous operations like DROP, TRUNCATE, ALTER, etc.
    const upperQuery = trimmedQuery.toUpperCase()
    const dangerousKeywords = [
      "DROP",
      "TRUNCATE",
      "ALTER",
      "CREATE",
      "GRANT",
      "REVOKE",
      "EXEC",
      "EXECUTE",
    ]

    // Allow SELECT, INSERT, UPDATE, DELETE
    const allowedKeywords = ["SELECT", "INSERT", "UPDATE", "DELETE", "WITH"]
    const startsWithAllowed = allowedKeywords.some((keyword) =>
      upperQuery.startsWith(keyword)
    )

    if (!startsWithAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Only SELECT, INSERT, UPDATE, DELETE queries are allowed",
        },
        { status: 400 }
      )
    }

    // Check for dangerous keywords
    const hasDangerousKeyword = dangerousKeywords.some((keyword) =>
      upperQuery.includes(keyword)
    )

    if (hasDangerousKeyword) {
      return NextResponse.json(
        {
          success: false,
          error: "Query contains dangerous operations that are not allowed",
        },
        { status: 400 }
      )
    }

    const db = createDb()
    const client = getPostgresClient(db)
    const commandType = getCommandType(upperQuery)
    const tableName = parseTableName(trimmedQuery, commandType)

    try {
      let result: any[] = []
      let rowCount = 0

      if ("unsafe" in client && typeof (client as any).unsafe === "function") {
        const sqlClient = client as postgres.Sql
        const rawResult =
          params && params.length > 0
            ? await sqlClient.unsafe(trimmedQuery, params)
            : await sqlClient.unsafe(trimmedQuery)
        result = Array.isArray(rawResult) ? rawResult : []
        const count = (rawResult as any)?.count
        // Prefer result.length when rows are returned (e.g. INSERT ... RETURNING with many rows)
        rowCount = result.length > 0 ? result.length : (typeof count === "number" ? count : result.length)
      } else {
        const pool = client as any
        const queryResult = await pool.query(trimmedQuery, params || [])
        result = queryResult.rows || []
        rowCount = queryResult.rowCount ?? result.length
      }

      return NextResponse.json(
        {
          success: true,
          data: result,
          rowCount,
          columns: result.length > 0 ? Object.keys(result[0]) : [],
          commandType,
          tableName: tableName ?? undefined,
        },
        { status: 200 }
      )
    } catch (error: any) {
      console.error("SQL execution error:", error)
      let errorMessage = error.message || "Failed to execute query"
      let hint: string | null = null
      if (errorMessage.includes("invalid input syntax for type json")) {
        hint = "For jsonb columns use NULL without quotes (not 'NULL'). Use valid JSON or cast with ::jsonb."
      }
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: error.detail || null,
          hint: hint ?? undefined,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Failed to execute SQL query:", error)
    const message = error instanceof Error ? error.message : "Failed to execute SQL query"
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> }
) {
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handlePost(ctx, request)
  })(request, context)
}







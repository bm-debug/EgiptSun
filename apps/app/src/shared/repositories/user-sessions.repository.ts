import { and, eq, isNull, sql, or, gt } from "drizzle-orm"
import BaseRepository from "./BaseRepositroy"
import { schema } from "../schema"
import type { UserSession, NewUserSession } from "../schema/types"
import { isPostgres } from "../utils/db"
import { SESSION_COOKIE_MAX_AGE_SECONDS } from "../session"
import { MeRepository } from "./me.repository"
import { getPostgresClient, executeRawQuery } from "./utils"
import { getRegionFromIp } from "../utils/ip-geolocation"

// Extended UserSession type that includes region from data_in
export type UserSessionWithRegion = UserSession & {
  region: string | null
}

export class UserSessionsRepository extends BaseRepository<UserSession> {
  constructor() {
    super(schema.userSessions)
  }

  public static getInstance(): UserSessionsRepository {
    return new UserSessionsRepository()
  }

  private static tableEnsured = false

  private async ensureTable(): Promise<void> {
    if (UserSessionsRepository.tableEnsured) return
    if (!isPostgres()) return
    try {
      // Probe
      await this.db.execute(sql`SELECT 1 FROM user_sessions LIMIT 1`)
      UserSessionsRepository.tableEnsured = true
      return
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/user_sessions/i.test(msg) || !/does not exist|undefined_table|relation/i.test(msg)) {
        // Unknown error, don't attempt DDL
        throw e
      }
    }

    // Create table if missing (matching PostgreSQL migration structure)
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id BIGSERIAL PRIMARY KEY,
        uuid text,
        user_uuid text NOT NULL,
        token_hash text NOT NULL,
        ip_address text,
        user_agent text,
        last_active_at TIMESTAMP,
        expires_at TIMESTAMP,
        revoked_at TIMESTAMP,
        xaid text,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        data_in text,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
    // Add revoked_at column if it doesn't exist (for existing tables)
    try {
      await this.db.execute(sql`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;`)
    } catch (e) {
      // Column might already exist, ignore
    }
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);`)
    await this.db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_uuid ON user_sessions (uuid);`)
    UserSessionsRepository.tableEnsured = true
  }

  public async createSession(input: {
    sessionUuid: string
    userId: number
    userAgent?: string | null
    ip?: string | null
    expiresAt: string
  }): Promise<void> {
    await this.ensureTable()
    const now = new Date().toISOString()
    // Get user UUID from userId
    const meRepo = MeRepository.getInstance()
    const userWithRoles = await meRepo.findByIdWithRoles(Number(input.userId))
    if (!userWithRoles || !userWithRoles.user) {
      throw new Error(`User with id ${input.userId} not found`)
    }
    const userUuid = userWithRoles.user.uuid
    
    // Determine region from IP (non-blocking, can be null)
    let region: string | null = null
    if (input.ip) {
      try {
        region = await getRegionFromIp(input.ip)
      } catch (error) {
        // Silently fail - region is optional
        console.debug('Failed to determine region from IP:', error)
      }
    }
    
    // Store region in data_in as JSON
    const dataIn = region ? JSON.stringify({ region }) : null
    
    // Use raw SQL with actual column names from PostgreSQL migration
    // Columns: uuid, user_uuid, token_hash, ip_address, user_agent, last_active_at, expires_at, xaid, created_at, data_in, updated_at
    await this.db.execute(sql`
      INSERT INTO user_sessions (uuid, user_uuid, token_hash, ip_address, user_agent, last_active_at, expires_at, created_at, data_in, updated_at)
      VALUES (
        ${input.sessionUuid},
        ${userUuid},
        ${input.sessionUuid},
        ${input.ip ?? null},
        ${input.userAgent ?? null},
        ${sql.raw(`'${now}'::TIMESTAMP`)},
        ${sql.raw(`'${input.expiresAt}'::TIMESTAMP`)},
        ${sql.raw(`'${now}'::TIMESTAMP`)},
        ${dataIn ?? null},
        ${sql.raw(`'${now}'::TIMESTAMP`)}
      )
    `)
  }

  public async ensureActiveSession(input: {
    sessionUuid: string
    userId: number
    userAgent?: string | null
    ip?: string | null
  }): Promise<boolean> {
    await this.ensureTable()
    const nowIso = new Date().toISOString()
    // Get user UUID from userId
    const meRepo = MeRepository.getInstance()
    const userWithRoles = await meRepo.findByIdWithRoles(Number(input.userId))
    if (!userWithRoles || !userWithRoles.user) {
      return false
    }
    const userUuid = userWithRoles.user.uuid
    // Use raw SQL with actual column names
    const client = getPostgresClient(this.db)
    const rows = await executeRawQuery<{
      uuid: string
      revoked_at: Date | string | null
      expires_at: Date | string | null
    }>(
      client,
      `SELECT uuid, NULL as revoked_at, expires_at
      FROM user_sessions
      WHERE uuid = $1 AND user_uuid = $2
      LIMIT 1`,
      [input.sessionUuid, userUuid]
    )

    if (!rows || rows.length === 0) {
      const expiresAt = new Date(Date.now() + SESSION_COOKIE_MAX_AGE_SECONDS * 1000).toISOString()
      await this.createSession({
        sessionUuid: input.sessionUuid,
        userId: input.userId,
        userAgent: input.userAgent ?? null,
        ip: input.ip ?? null,
        expiresAt,
      })
      return true
    }

    const row = rows[0]
    if (row.revoked_at) return false
    // expires_at is TIMESTAMP, compare properly
    if (row.expires_at) {
      const expiresAtDate = typeof row.expires_at === 'string' ? new Date(row.expires_at) : row.expires_at
      const nowDate = new Date(nowIso)
      if (expiresAtDate <= nowDate) return false
    }

    // Only update last_active_at, keep original user_agent and ip_address
    await this.touch(input.sessionUuid)
    return true
  }

  public async listActiveByUserId(userId: number): Promise<UserSessionWithRegion[]> {
    await this.ensureTable()
    const nowIso = new Date().toISOString()
    // Get user UUID from userId
    const meRepo = MeRepository.getInstance()
    const userWithRoles = await meRepo.findByIdWithRoles(Number(userId))
    if (!userWithRoles || !userWithRoles.user) {
      return []
    }
    const userUuid = userWithRoles.user.uuid
    // Use raw SQL with actual column names from PostgreSQL migration
    // Use getPostgresClient and executeRawQuery for proper parameter handling
    const client = getPostgresClient(this.db)
    const rows = await executeRawQuery<{
      id: number
      uuid: string
      user_uuid: string
      ip_address: string | null
      user_agent: string | null
      data_in: string | null
      last_active_at: Date | string | null
      expires_at: Date | string | null
      revoked_at: Date | string | null
      created_at: Date | string | null
      updated_at: Date | string | null
    }>(
      client,
      `SELECT 
        id,
        uuid,
        user_uuid,
        ip_address,
        user_agent,
        data_in,
        last_active_at,
        expires_at,
        COALESCE(revoked_at, NULL) as revoked_at,
        created_at,
        updated_at
      FROM user_sessions
      WHERE user_uuid = $1
        AND (revoked_at IS NULL)
        AND (expires_at IS NULL OR expires_at > $2::TIMESTAMP)
      ORDER BY last_active_at DESC NULLS LAST`,
      [userUuid, nowIso]
    )
    return rows.map((row) => {
      // Parse region from data_in JSON
      let region: string | null = null
      if (row.data_in) {
        try {
          const dataIn = JSON.parse(row.data_in)
          region = dataIn?.region || null
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
      return {
        id: row.id,
        uuid: row.uuid,
        userId: userId,
        userAgent: row.user_agent,
        ip: row.ip_address,
        region,
        lastSeenAt: row.last_active_at ? (typeof row.last_active_at === 'string' ? row.last_active_at : new Date(row.last_active_at).toISOString()) : null,
        expiresAt: row.expires_at ? (typeof row.expires_at === 'string' ? row.expires_at : new Date(row.expires_at).toISOString()) : null,
        revokedAt: row.revoked_at ? (typeof row.revoked_at === 'string' ? row.revoked_at : new Date(row.revoked_at).toISOString()) : null,
        createdAt: row.created_at ? (typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString()) : null,
        updatedAt: row.updated_at ? (typeof row.updated_at === 'string' ? row.updated_at : new Date(row.updated_at).toISOString()) : null,
      }
    }) as UserSessionWithRegion[]
  }

  public async revokeSession(sessionUuid: string, userId: number): Promise<void> {
    await this.ensureTable()
    const now = new Date().toISOString()
    // Get user UUID from userId
    const meRepo = MeRepository.getInstance()
    const userWithRoles = await meRepo.findByIdWithRoles(Number(userId))
    if (!userWithRoles || !userWithRoles.user) {
      throw new Error(`User with id ${userId} not found`)
    }
    const userUuid = userWithRoles.user.uuid
    // Use raw SQL with actual column names
    // First ensure revoked_at column exists
    try {
      await this.db.execute(sql`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;`)
    } catch (e) {
      // Column might already exist, ignore
    }
    const client = getPostgresClient(this.db)
    await executeRawQuery(
      client,
      `UPDATE user_sessions
      SET revoked_at = $1::TIMESTAMP, updated_at = $2::TIMESTAMP
      WHERE uuid = $3 AND user_uuid = $4`,
      [now, now, sessionUuid, userUuid]
    )
  }

  public async touch(sessionUuid: string): Promise<void> {
    await this.ensureTable()
    const now = new Date().toISOString()
    // Use raw SQL with actual column names
    // Only update last_active_at and updated_at, NOT user_agent or ip_address
    // Each session keeps its original device/browser info from when it was created
    await this.db.execute(sql`
      UPDATE user_sessions
      SET last_active_at = ${sql.raw(`'${now}'::TIMESTAMP`)}, updated_at = ${sql.raw(`'${now}'::TIMESTAMP`)}
      WHERE uuid = ${sessionUuid}
    `)
  }

  public async isActiveSessionForUser(sessionUuid: string, userId: number): Promise<boolean> {
    await this.ensureTable()
    const nowIso = new Date().toISOString()
    // Get user UUID from userId
    const meRepo = MeRepository.getInstance()
    const userWithRoles = await meRepo.findByIdWithRoles(Number(userId))
    if (!userWithRoles || !userWithRoles.user) {
      return false
    }
    const userUuid = userWithRoles.user.uuid
    // Use raw SQL with actual column names
    // Check if revoked_at column exists before using it
    const client = getPostgresClient(this.db)
    const rows = await executeRawQuery<{ count: number }>(
      client,
      `SELECT 1 as count
      FROM user_sessions
      WHERE uuid = $1
        AND user_uuid = $2
        AND (expires_at IS NULL OR expires_at > $3::TIMESTAMP)
      LIMIT 1`,
      [sessionUuid, userUuid, nowIso]
    )
    return (rows as any[]).length > 0
  }

  public async listRevokedByUserId(userId: number): Promise<UserSessionWithRegion[]> {
    await this.ensureTable()
    // Get user UUID from userId
    const meRepo = MeRepository.getInstance()
    const userWithRoles = await meRepo.findByIdWithRoles(Number(userId))
    if (!userWithRoles || !userWithRoles.user) {
      return []
    }
    const userUuid = userWithRoles.user.uuid
    // Use raw SQL with actual column names from PostgreSQL migration
    const client = getPostgresClient(this.db)
    const rows = await executeRawQuery<{
      id: number
      uuid: string
      user_uuid: string
      ip_address: string | null
      user_agent: string | null
      data_in: string | null
      last_active_at: Date | string | null
      expires_at: Date | string | null
      revoked_at: Date | string | null
      created_at: Date | string | null
      updated_at: Date | string | null
    }>(
      client,
      `SELECT 
        id,
        uuid,
        user_uuid,
        ip_address,
        user_agent,
        data_in,
        last_active_at,
        expires_at,
        revoked_at,
        created_at,
        updated_at
      FROM user_sessions
      WHERE user_uuid = $1
        AND revoked_at IS NOT NULL
      ORDER BY revoked_at DESC`,
      [userUuid]
    )
    return rows.map((row) => {
      // Parse region from data_in JSON
      let region: string | null = null
      if (row.data_in) {
        try {
          const dataIn = JSON.parse(row.data_in)
          region = dataIn?.region || null
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
      return {
        id: row.id,
        uuid: row.uuid,
        userId: userId,
        userAgent: row.user_agent,
        ip: row.ip_address,
        region,
        lastSeenAt: row.last_active_at ? (typeof row.last_active_at === 'string' ? row.last_active_at : new Date(row.last_active_at).toISOString()) : null,
        expiresAt: row.expires_at ? (typeof row.expires_at === 'string' ? row.expires_at : new Date(row.expires_at).toISOString()) : null,
        revokedAt: row.revoked_at ? (typeof row.revoked_at === 'string' ? row.revoked_at : new Date(row.revoked_at).toISOString()) : null,
        createdAt: row.created_at ? (typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString()) : null,
        updatedAt: row.updated_at ? (typeof row.updated_at === 'string' ? row.updated_at : new Date(row.updated_at).toISOString()) : null,
      }
    }) as UserSessionWithRegion[]
  }
}

export function getClientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]?.trim() || null
  const cf = request.headers.get("cf-connecting-ip")
  if (cf) return cf.trim()
  return null
}



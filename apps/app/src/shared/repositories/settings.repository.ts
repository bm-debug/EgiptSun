import BaseRepository from './BaseRepositroy'
import { Setting, NewSetting } from '../schema/types'
import { schema } from '../schema'
import { eq, and, like, sql } from 'drizzle-orm'
import { getRoleSchemaAttribute } from '../types/role-schema-settings'

export class SettingsRepository extends BaseRepository<Setting> {
  constructor() {
    super(schema.settings)
  }

  public static getInstance(): SettingsRepository {
    return new SettingsRepository()
  }


  /**
   * Find setting by attribute
   */
  public async findByAttribute(attribute: string): Promise<Setting | null> {
    const [setting] = await this.db
      .select()
      .from(this.schema)
      .where(eq(this.schema.attribute, attribute))
      .limit(1)
      .execute()
    
    return (setting as Setting) || null
  }

  /**
   * Find role schema setting by role name.
   * Uses attribute = role_schema_{roleName}
   */
  public async findByRoleSchema(roleName: string): Promise<Setting | null> {
    return this.findByAttribute(getRoleSchemaAttribute(roleName))
  }

  /**
   * Find role schema setting by dataIn.base_url (e.g. "/test").
   * Used to resolve cabinet routes from URL path.
   */
  public async findByRoleSchemaBaseUrl(base_url: string): Promise<Setting | null> {
    const [setting] = await this.db
      .select()
      .from(this.schema)
      .where(
        and(
          like(this.schema.attribute, 'role_schema_%'),
          sql`(${this.schema.dataIn}::jsonb)->>'base_url' = ${base_url}`
        )
      )
      .limit(1)
      .execute()
    if (setting) return setting as Setting

    // Fallback: handle cases where data_in is stored as plain/escaped JSON string
    const pattern = `%\"base_url\":\"${base_url}\"%`
    const escapedPattern = `%\\\"base_url\\\":\\\"${base_url}\\\"%`
    const [fallback] = await this.db
      .select()
      .from(this.schema)
      .where(
        and(
          like(this.schema.attribute, 'role_schema_%'),
          sql`(${this.schema.dataIn})::text ILIKE ${pattern} OR (${this.schema.dataIn})::text ILIKE ${escapedPattern}`
        )
      )
      .limit(1)
      .execute()
    return (fallback as Setting) || null
  }

  /**
   * Update setting by UUID
   */
  public async updateByUuid(
    uuid: string,
    data: Partial<NewSetting>
  ): Promise<Setting> {
    return await this.update(uuid, data)
  }
}


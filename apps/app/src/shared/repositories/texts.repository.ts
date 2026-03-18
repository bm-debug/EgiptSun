import { and, eq, or, sql } from 'drizzle-orm'
import BaseRepository from './BaseRepositroy'
import { schema } from '../schema'
import { NewText, Text } from '../schema/types'
import { withNotDeleted } from './utils'
import { generateAid } from '../generate-aid'
import { altrpText, altrpTextDataIn } from '../types/altrp'
import { NewaltrpText } from '../types/altrp'
import { DbFilters, DbOrders, DbPaginatedResult, DbPagination } from '../types/shared'

export class TextsRepository extends BaseRepository<altrpText> {
  constructor() {
    super(schema.texts)
  }

  public static getInstance(): TextsRepository {
    return new TextsRepository()
  }

  protected async beforeCreate(data: Partial<NewaltrpText>): Promise<void> {
    if (!data.uuid) {
      data.uuid = crypto.randomUUID()
    }
    if (!data.taid) {
      data.taid = generateAid('t')
    }
    if (!data.statusName) {
      data.statusName = 'DRAFT'
    }
    if (typeof data.isPublic === 'undefined') {
      data.isPublic = true
    }
  }

  public async findByType(type: string, statusName?: string): Promise<altrpText[]> {
    const condition = withNotDeleted(
      this.schema.deletedAt,
      eq(this.schema.type, type),
      statusName ? eq(this.schema.statusName, statusName) : undefined
    )

    const rows = await this.db.select().from(this.schema).where(condition).execute()
    return rows as altrpText[]
  }

  public async findPublishedByType(type: string): Promise<altrpText[]> {
    return this.findByType(type, 'PUBLISHED') as Promise<altrpText[]>
  }

  /** Blog list for APP: type ARTICLES, status_name ACTIVE, is_public = true. Optional locale filters by dataIn.locale (null/absent = default). */
  public async findBlogArticles(locale?: string): Promise<altrpText[]> {
    const baseCondition = withNotDeleted(
      this.schema.deletedAt,
      eq(this.schema.type, 'ARTICLES'),
      eq(this.schema.statusName, 'ACTIVE'),
      eq(this.schema.isPublic, true)
    )
    const localeNorm = locale?.toLowerCase().trim()
    const condition = localeNorm
      ? and(
          baseCondition,
          or(
            sql`${this.schema.dataIn}::jsonb->>'locale' = ${localeNorm}`,
            localeNorm === 'en' ? sql`${this.schema.dataIn}::jsonb->>'locale' IS NULL` : sql`1=0`
          )
        )
      : baseCondition
    const rows = await this.db.select().from(this.schema).where(condition).execute()
    return rows as altrpText[]
  }

  public async updateStatus(uuid: string, statusName: string): Promise<altrpText> {
    return this.update(uuid, { statusName })
  }
  public async findBySlug(slug: altrpTextDataIn['slug']): Promise<altrpText | null> {
    const condition = withNotDeleted(
      this.schema.deletedAt,
      sql`${this.schema.dataIn}::jsonb->>'slug' = ${slug}`
    )

    const [text] = await this.db
      .select()
      .from(this.schema)
      .where(condition)
      .limit(1)
      .execute()

    return (text as altrpText | undefined) || null
  }

  public async findByTaid(taid: string): Promise<altrpText | null> {
    const condition = withNotDeleted(
      this.schema.deletedAt,
      eq(this.schema.taid, taid)
    )

    const [text] = await this.db
      .select()
      .from(this.schema)
      .where(condition)
      .limit(1)
      .execute()

    return text ? (text as altrpText) : null
  }

  public async getFilteredBlog(filters: DbFilters, orders: DbOrders, pagination: DbPagination): Promise<DbPaginatedResult<altrpText>> {
    filters.conditions = filters.conditions ?? []
    filters.conditions.push({
      field: 'type',
      operator: 'eq',
      values: ['BLOG']
    })
    // Исключаем удалённые записи
    filters.conditions.push({
      field: 'deletedAt',
      operator: 'isNull',
      values: []
    })

    // Default order by id desc if no order specified
    if (!orders.orders || orders.orders.length === 0) {
      orders.orders = [{
        field: 'id',
        direction: 'desc',
      }]
    }

    return this.getFiltered(filters, orders, pagination) as Promise<DbPaginatedResult<altrpText>>
  }
  
}



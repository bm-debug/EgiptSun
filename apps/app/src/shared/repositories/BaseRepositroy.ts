import { eq, sql } from "drizzle-orm";
import { SiteDb, buildDbFilters, buildDbOrders, createDb } from "./utils";
import BaseCollection from "../collections/BaseCollection";
import type { DbFilters, DbOrders, DbPagination, DbPaginatedResult } from "../types/shared";
import { isPostgres } from "../utils/db";


export default class BaseRepository<T> {
    protected db: SiteDb;

    private static readonly _jsonFieldKeys = new Set([
        // canonical jsonb-ish columns in this project
        "dataIn",
        "data_in",
    ]);

    private static normalizePossiblyDoubleJsonString(value: unknown): unknown {
        if (value == null) return value;
        if (typeof value !== "string") return value;

        const s = value.trim();
        if (!s) return value;

        // First parse attempt: handles normal JSON objects/arrays, numbers, booleans, null, or JSON-strings
        try {
            const parsed = JSON.parse(s);

            // If someone double-stringified a JSON object, parsed is a string like: {"a":1}
            if (typeof parsed === "string") {
                const inner = parsed.trim();
                if (inner && (inner.startsWith("{") || inner.startsWith("["))) {
                    try {
                        return JSON.parse(inner);
                    } catch {
                        return parsed;
                    }
                }
                return parsed;
            }

            return parsed;
        } catch {
            // Not JSON at all, keep as-is
            return value;
        }
    }

    private static normalizeJsonFields(data: Record<string, unknown>): Record<string, unknown> {
        // Only needed for Postgres jsonb columns: Postgres will happily store a JSON string
        // (e.g. "\"{\\\"a\\\":1}\"") as jsonb string, which is not what we want.
        if (!isPostgres()) return data;

        for (const key of Object.keys(data)) {
            if (!BaseRepository._jsonFieldKeys.has(key)) continue;
            data[key] = BaseRepository.normalizePossiblyDoubleJsonString(data[key]);
        }

        return data;
    }

    constructor(public schema: any) {
        this.db = createDb();
    }
    protected async beforeCreate(data: Partial<T>): Promise<void> { }
    protected async afterCreate(entity: T): Promise<void> { }
    protected async beforeUpdate(uuid: string, data: Partial<T>): Promise<void> { }
    protected async afterUpdate(entity: T): Promise<void> { }
    protected async beforeDelete(uuid: string, force: boolean, entity: T): Promise<void> { }
    protected async afterDelete(uuid: string, force: boolean, entity: T ): Promise<void> { }

    public static getInstance(schema: any): BaseRepository<any> {
        return new BaseRepository(schema);
    }
    public getSelectQuery() {
        return this.db.select().from(this.schema)
    }
    async findByUuid(uuid: string): Promise<T> {
        const [row] = await this.db.select().from(this.schema).where(eq(this.schema.uuid, uuid)).execute();
        return row as T;
    }
    async findById(id: number): Promise<T> {
        const [row] = await this.db.select().from(this.schema).where(eq(this.schema.id, id)).execute();
        return row as T;
    }
    async findAll(): Promise<T[]> {
        const rows = await this.db.select().from(this.schema).execute();
        return rows as T[];
    }
    async create(data: any): Promise<T> {
        if (data && typeof data === "object") {
            BaseRepository.normalizeJsonFields(data as Record<string, unknown>);
        }
        if (!data.uuid) {
            data.uuid = crypto.randomUUID();
        }
        // Устанавливаем время в UTC для всех БД
        // Для PostgreSQL: используем объект Date, который автоматически конвертируется в UTC timestamp
        // Для SQLite: используем ISO строку с суффиксом Z (UTC)
        const now = isPostgres() ? new Date() : new Date().toISOString();
        if (this.schema.createdAt) {
            data.createdAt = now;
        }
        if (this.schema.updatedAt) {
            data.updatedAt = now;
        }

        await this.beforeCreate(data as Partial<T>);

        // PostgreSQL supports returning(), SQLite doesn't
        const insertedRows = await this.db.insert(this.schema).values(data).returning() as T[];
        const entity = insertedRows && insertedRows.length > 0 ? insertedRows[0] : (await this.findByUuid(data.uuid));

        await this.afterCreate(entity as T);
        return entity;
    }
    async update(uuid: string, data: any, collection: BaseCollection | null = null): Promise<T> {

        if (!collection) {
            collection = new BaseCollection();
        }

        if (data && typeof data === "object") {
            BaseRepository.normalizeJsonFields(data as Record<string, unknown>);
        }

        // Устанавливаем время в UTC для всех БД
        // Для PostgreSQL: используем объект Date, который автоматически конвертируется в UTC timestamp
        // Для SQLite: используем ISO строку с суффиксом Z (UTC)
        if (this.schema.updatedAt) {
            data.updatedAt = isPostgres() ? new Date() : new Date().toISOString();
        }
        await this.beforeUpdate(uuid, data as Partial<T>);
        await this.db.update(this.schema).set(data).where(eq(this.schema.uuid, uuid)).execute();
        const entity = await this.findByUuid(uuid);
        await this.afterUpdate(entity);
        return entity;
    }
    async deleteByUuid(uuid: string, force: boolean = false): Promise<void> {
        const entity = await this.findByUuid(uuid);
        if (!entity) {
            throw new Error('Entity not found');
        }
        await this.beforeDelete(uuid, force, entity);
        if (force) {
            await this._forceDeleteByUuid(uuid);
        } else {
            await this._softDeleteByUuid(uuid);
        }
        await this.afterDelete(uuid, force, entity);
    }
    protected async _forceDeleteByUuid(uuid: string) {
        return await this.db.delete(this.schema).where(eq(this.schema.uuid, uuid)).execute();
    }
    protected async _softDeleteByUuid(uuid: string) {

        if (this.schema.deletedAt) {
            // Устанавливаем время в UTC для всех БД
            const deletedAt = isPostgres() ? new Date() : new Date().toISOString();
            return await this.db.update(this.schema).set({ deletedAt }).where(eq(this.schema.uuid, uuid)).execute();
        }

        return await this.db.delete(this.schema).where(eq(this.schema.uuid, uuid)).execute();
    }

    public async getFiltered(filters: DbFilters, orders: DbOrders, pagination: DbPagination): Promise<DbPaginatedResult<T>> {
        const query = this.getSelectQuery()
        const where = buildDbFilters(this.schema, filters)
        const order = buildDbOrders(this.schema, orders)

        const limit = Math.max(1, Math.min(pagination.limit ?? 10, 100))
        const page = Math.max(1, pagination.page ?? 1)
        const offset = (page - 1) * limit

        // Get total count
        const countQuery = this.getSelectQuery()
        const totalRows = where
            ? await countQuery.where(where).execute()
            : await countQuery.execute()
        const total = totalRows.length

        const resultQuery = where
            ? query.where(where).orderBy(...order).limit(limit).offset(offset)
            : query.orderBy(...order).limit(limit).offset(offset)
        const result = await resultQuery.execute() as T[]

        return {
            docs: result,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        }
    }
}
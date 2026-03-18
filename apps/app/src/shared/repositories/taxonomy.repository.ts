import BaseRepository from "./BaseRepositroy";
import {
    Taxonomy,
} from '../schema/types'
import {
    schema
} from '../schema'

import { DbFilters, DbOrders, DbPagination, DbPaginatedResult } from "../types/shared";
import { buildDbFilters, buildDbOrders, withNotDeleted } from "./utils";
import { sql, eq, asc } from "drizzle-orm";

export class TaxonomyRepository extends BaseRepository<Taxonomy>{
    
    constructor() {
        super(schema.taxonomy)
    }

    public static getInstance(): TaxonomyRepository {
        return new TaxonomyRepository()
    }

    async findPaginated({ 
        page = 1, 
        limit = 20,
        entity,
        filters,
      }: { 
        page?: number; 
        limit?: number;
        entity?: string;
        filters?: DbFilters;
      }): Promise<{
        docs: Taxonomy[];
        totalDocs: number;
        limit: number;
        totalPages: number;
        page: number;
      }> {
        const offset = (page - 1) * limit;
    
        // Build where condition
        const filtersCondition = buildDbFilters(schema.taxonomy, filters);
        console.log('filtersCondition', filtersCondition);  
        console.log('filters', filters);
    
        const whereCondition = entity 
          ? withNotDeleted(schema.taxonomy.deletedAt, eq(schema.taxonomy.entity, entity), filtersCondition)
          : withNotDeleted(schema.taxonomy.deletedAt, filtersCondition);
    
        // Get total count
        const countResult = await this.db
          .select({ count: schema.taxonomy.id })
          .from(schema.taxonomy)
          .where(whereCondition)
          .execute();
        
        const totalDocs = countResult.length;
    
        // Get paginated results
        const docs = await this.db
          .select()
          .from(schema.taxonomy)
          .where(whereCondition)
          .orderBy(asc(schema.taxonomy.sortOrder), asc(schema.taxonomy.name))
          .limit(limit)
          .offset(offset)
          .execute();
    
        const totalPages = Math.ceil(totalDocs / limit);
    
        return {
          docs,
          totalDocs,
          limit,
          totalPages,
          page,
        };
      }
    /**
     * получение taxonomy с фильтрацией
     */
    public async getTaxonomies({
        filters,
        orders,
        pagination,
    }: {
        filters?: DbFilters
        orders?: DbOrders
        pagination?: DbPagination
    } = {}): Promise<DbPaginatedResult<Taxonomy>> {
        const filtersCondition = buildDbFilters(this.schema, filters);
        const whereCondition = withNotDeleted(this.schema.deletedAt, filtersCondition);

        const totalRows = await this.db
            .select({ count: sql<number>`count(*)`.mapWith(Number) })
            .from(this.schema)
            .where(whereCondition)
            .execute();

        const total = totalRows[0]?.count ?? 0;
        const limit = Math.max(1, Math.min(pagination?.limit ?? 20, 100));
        const page = Math.max(1, pagination?.page ?? 1);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const offset = (page - 1) * limit;


        const docs = await this.db
            .select()
            .from(this.schema)
            .where(whereCondition)
            .orderBy(...buildDbOrders(this.schema, orders))
            .limit(limit)
            .offset(offset)
            .execute();

        return {
            docs: docs as Taxonomy[],
            pagination: {
                total,
                page,
                limit,
                totalPages,
            },
        };
    }
}
import { and, eq, sql } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { schema } from "../schema";
import type { Text } from "../schema/types";
import BaseRepository from "./BaseRepositroy";
import { withNotDeleted, type SiteDb } from "./utils";

export class NewsRepository extends BaseRepository<Text> {
  private static instance: NewsRepository | null = null;

  private constructor() {
    super( schema.texts);
  }

  public static getInstance(): NewsRepository {
    if (!NewsRepository.instance) {
      NewsRepository.instance = new NewsRepository();
    }
    return NewsRepository.instance;
  }

  async findBySlug(slug: string): Promise<Text | null> {
    // Primary lookup: use JSONB extraction (works when column stores JSON/JSONB or valid JSON string)
    const [article] = await this.db
      .select()
      .from(schema.texts)
      .where(
        withNotDeleted(
          schema.texts.deletedAt,
          and(
            eq(schema.texts.type, "news"),
            // Cast to JSONB to avoid operator errors when stored as text
            sql`(${schema.texts.dataIn})::jsonb ->> 'slug' = ${slug}`
          )
        )
      )
      .limit(1)
      .execute();
      
    if (article) {
      return article;
    }

    // Fallback 1: handle cases where data_in is stored as plain text with escaped JSON
    const pattern = `%\\\\"slug\\\\":\\\\"${slug}\\\\"%`;
    const [fallback] = await this.db
      .select()
      .from(schema.texts)
      .where(
        withNotDeleted(
          schema.texts.deletedAt,
          and(
            eq(schema.texts.type, "news"),
            sql`(${schema.texts.dataIn})::text ILIKE ${pattern}`
          )
        )
      )
      .limit(1)
      .execute();


    return fallback ?? null;
  }
}


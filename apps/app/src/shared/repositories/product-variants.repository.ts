import { eq, or, desc } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { schema } from "../schema";
import type { ProductVariant } from "../schema/types";
import { createDb, parseJson, notDeleted, withNotDeleted, type SiteDb } from "./utils";
import BaseRepository from "./BaseRepositroy";

type FormulaMetrics = {
  width?: number;
  height?: number;
  depth?: number;
  weight?: number;
  [key: string]: number | undefined;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export class ProductVariantsRepository extends BaseRepository<ProductVariant> {
  private static instance: ProductVariantsRepository | null = null;

  private constructor() {
    super(schema.productVariants);
  }

  public static getInstance(
  ): ProductVariantsRepository {
    if (!ProductVariantsRepository.instance) {
      ProductVariantsRepository.instance = new ProductVariantsRepository();
    }
    return ProductVariantsRepository.instance;
  }

  async findByFullPaid(fullPaid: string): Promise<ProductVariant | undefined> {
    const [variant] = await this.db
      .select()
      .from(schema.productVariants)
      .where(withNotDeleted(
        schema.productVariants.deletedAt,
        eq(schema.productVariants.fullPaid, fullPaid)
      ))
      .limit(1);

    return variant;
  }

  async findByTitle(title: string): Promise<ProductVariant | undefined> {
    const [variant] = await this.db
      .select()
      .from(schema.productVariants)
      .where(withNotDeleted(
        schema.productVariants.deletedAt,
        eq(schema.productVariants.title, title)
      ))
      .limit(1);

    return variant;
  }

  async findPaginated(options: {
    page?: number;
    limit?: number;
  }): Promise<{
    docs: ProductVariant[];
    totalDocs: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.max(options.limit || 20, 1);
    const offset = (page - 1) * limit;

    // Get total count (excluding soft-deleted)
    const countResult = await this.db
      .select({ count: schema.productVariants.id })
      .from(schema.productVariants)
      .where(notDeleted(schema.productVariants.deletedAt))
      .execute();
    
    const totalDocs = countResult.length;

    // Get paginated data (excluding soft-deleted)
    const docs = await this.db
      .select()
      .from(schema.productVariants)
      .where(notDeleted(schema.productVariants.deletedAt))
      .orderBy(desc(schema.productVariants.id))
      .limit(limit)
      .offset(offset)
      .execute();

    const totalPages = Math.ceil(totalDocs / limit);

    return {
      docs,
      totalDocs,
      totalPages,
      page,
      limit,
    };
  }

  async calculatePriceByFormula(
    variant: ProductVariant,
    metrics: FormulaMetrics
  ): Promise<number> {
    const data = parseJson<Record<string, unknown>>(variant.dataIn, {});
    const formula = data?.formula;

    if (typeof formula !== "string" || !formula.trim()) {
      return 0;
    }

    const context: Record<string, number> = {
      width: toNumber(metrics.width),
      height: toNumber(metrics.height),
      depth: toNumber(metrics.depth),
      weight: toNumber(metrics.weight),
    };

    try {
      const args = Object.keys(context);
      const values = Object.values(context);
      // eslint-disable-next-line no-new-func
      const evaluator = new Function(...args, `return ${formula};`);
      const result = evaluator(...values);
      return toNumber(result);
    } catch (error) {
      console.error("Failed to evaluate variant formula", {
        variant: variant.fullPaid,
        formula,
        error,
      });
      return 0;
    }
  }

  async getAvailableQuantity(
    fullPaid: string,
    options: { locationLaid?: string } = {}
  ): Promise<number> {
    const baseQuery = this.db
      .select({
        status: schema.baseMoves.statusName,
        dataIn: schema.baseMoves.dataIn,
        laidFrom: schema.baseMoves.laidFrom,
        laidTo: schema.baseMoves.laidTo,
      })
      .from(schema.baseMoves);

    const moves = options.locationLaid
      ? await baseQuery.where(
          or(
            eq(schema.baseMoves.laidTo, options.locationLaid),
            eq(schema.baseMoves.laidFrom, options.locationLaid)
          )
        )
      : await baseQuery;

    let balance = 0;

    for (const move of moves) {
      const data = parseJson<Record<string, unknown>>(move.dataIn, {});
      const inventory = (data as Record<string, unknown>)?.inventory_list ??
        (data as Record<string, unknown>)?.inventory;

      if (!Array.isArray(inventory)) {
        continue;
      }

      for (const rawItem of inventory) {
        const item = rawItem as Record<string, unknown>;
        const variantKey = (item?.variantFullPaid || item?.productVariantFullPaid || item?.full_paid) as
          | string
          | undefined;

        if (variantKey !== fullPaid) {
          continue;
        }

        const quantity = toNumber(item?.quantity ?? item?.hiddenQuantity);
        balance += quantity;
      }
    }

    return balance;
  }

  async filterOptionsForLocation(
    options: Array<{ label: string; [key: string]: unknown }>,
    employeeLocationLaid: string | null | undefined,
    isManager: boolean
  ): Promise<Array<{ label: string; [key: string]: unknown }>> {
    if (isManager || !employeeLocationLaid) {
      return options;
    }

    const [location] = await this.db
      .select({ title: schema.locations.title })
      .from(schema.locations)
      .where(eq(schema.locations.laid, employeeLocationLaid))
      .limit(1);

    if (!location?.title) {
      return options;
    }

    const reference = parseInt(String(location.title).trim(), 10);
    if (Number.isNaN(reference)) {
      return options;
    }

    return options.filter((option) => {
      const candidate = parseInt(String(option.label ?? "").trim(), 10);
      return candidate === reference;
    });
  }

  /**
   * Find product variants paginated by location
   * Uses relations to filter variants that belong to products linked to the location
   * @param options - Pagination options with locationLaid
   */
  async findPaginatedByLocation(options: {
    page?: number;
    limit?: number;
    locationLaid: string;
  }): Promise<{
    docs: ProductVariant[];
    totalDocs: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.max(options.limit || 20, 1);
    const offset = (page - 1) * limit;

    // Import RelationsRepository dynamically to avoid circular dependencies
    const { RelationsRepository } = await import('./relations.repository');
    const relationsRepo = RelationsRepository.getInstance();

    // Get product paid identifiers linked to this location
    const productsPaid = await relationsRepo.getProductsPaidByLocation(options.locationLaid);

    if (productsPaid.length === 0) {
      return {
        docs: [],
        totalDocs: 0,
        totalPages: 0,
        page,
        limit,
      };
    }

    // Get all variants (excluding soft-deleted) and filter by product prefix
    const allVariants = await this.db
      .select()
      .from(schema.productVariants)
      .where(notDeleted(schema.productVariants.deletedAt))
      .orderBy(desc(schema.productVariants.id))
      .execute();

    // Filter variants that belong to linked products
    // A variant belongs to a product if its full_paid starts with "product.paid-"
    const filteredVariants = allVariants.filter(v => {
      return productsPaid.some(paid => v.fullPaid.startsWith(`${paid}-`));
    });

    const totalDocs = filteredVariants.length;
    const totalPages = Math.ceil(totalDocs / limit);

    // Apply pagination
    const docs = filteredVariants.slice(offset, offset + limit);

    return {
      docs,
      totalDocs,
      totalPages,
      page,
      limit,
    };
  }
}

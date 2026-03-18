import { eq, and, isNull, inArray } from 'drizzle-orm'
import type { Relation, NewRelation } from '../schema/types'
import { schema } from '../schema/schema'
import BaseRepository from './BaseRepositroy'
import { generateAid } from '@/shared/generate-aid'
import { createDb, parseJson, stringifyJson, notDeleted, withNotDeleted, type SiteDb } from "./utils";

export class RelationsRepository extends BaseRepository<Relation> {
  private static instance: RelationsRepository | null = null

  private constructor() {
    super(schema.relations)
  }

  public static getInstance(): RelationsRepository {
    if (!RelationsRepository.instance) {
      RelationsRepository.instance = new RelationsRepository()
    }
    return RelationsRepository.instance
  }

  /**
   * Find all relations by source entity and type
   */
  async findBySourceEntity(sourceEntity: string, type?: string): Promise<Relation[]> {
    const conditions = [
      eq(this.schema.sourceEntity, sourceEntity),
      isNull(this.schema.deletedAt),
    ]
    
    if (type) {
      conditions.push(eq(this.schema.type, type))
    }

    return (await this.db
      .select()
      .from(this.schema)
      .where(and(...conditions))
      .execute()) as Relation[]
  }

  /**
   * Find all relations by target entity and type
   */
  async findByTargetEntity(targetEntity: string, type?: string): Promise<Relation[]> {
    const conditions = [
      eq(this.schema.targetEntity, targetEntity),
      isNull(this.schema.deletedAt),
    ]
    
    if (type) {
      conditions.push(eq(this.schema.type, type))
    }

    return (await this.db
      .select()
      .from(this.schema)
      .where(and(...conditions))
      .execute()) as Relation[]
  }

  /**
   * Find relation by source and target entities
   */
  async findBySourceAndTarget(
    sourceEntity: string,
    targetEntity: string,
    type?: string
  ): Promise<Relation | null> {
    const conditions = [
      eq(this.schema.sourceEntity, sourceEntity),
      eq(this.schema.targetEntity, targetEntity),
      isNull(this.schema.deletedAt),
    ]
    
    if (type) {
      conditions.push(eq(this.schema.type, type))
    }

    const result = (await this.db
      .select()
      .from(this.schema)
      .where(and(...conditions))
      .limit(1)
      .execute()) as Relation[]

    return result[0] || null
  }

  /**
   * Create multiple relations
   */
  async createMany(relations: NewRelation[]): Promise<Relation[]> {
    const created: Relation[] = []
    
    for (const relation of relations) {
      const newRelation: NewRelation = {
        ...relation,
        uuid: relation.uuid || crypto.randomUUID(),
        xaid: relation.xaid || generateAid('x'),
      }
      
      const result = await this.create(newRelation)
      created.push(result)
    }
    
    return created
  }

  /**
   * Delete relations by source entity and type (soft delete)
   */
  async deleteBySourceEntity(sourceEntity: string, type?: string): Promise<void> {
    const conditions = [
      eq(this.schema.sourceEntity, sourceEntity),
      isNull(this.schema.deletedAt),
    ]
    
    if (type) {
      conditions.push(eq(this.schema.type, type))
    }

    await this.db
      .update(this.schema)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(...conditions))
      .execute()
  }

  /**
   * Replace relations for a source entity (delete old, create new)
   */
  async replaceRelations(
    sourceEntity: string,
    targetEntities: string[],
    type: string,
    order?: number
  ): Promise<Relation[]> {
    // Soft delete existing relations
    await this.deleteBySourceEntity(sourceEntity, type)

    // Create new relations
    const newRelations: NewRelation[] = targetEntities.map((targetEntity, index) => ({
      sourceEntity,
      targetEntity,
      type,
      order: String(order !== undefined ? order + index : index),
    }))

    return this.createMany(newRelations)
  }
  
  
  /**
   * Link variant to base move with temp_quantity
   */
  async linkVariantToBaseMove(
    variantFullPaid: string,
    baseMoveFullBaid: string,
    opts?: {
      statusName?: string;
      type?: string;
      tempQuantity?: number;
      quantity?: number;
      dataIn?: Record<string, unknown>;
    }
  ): Promise<Relation> {
    const relationType = opts?.type || 'MOVE_ITEM';
    
    // For INVENTORY_ITEM, always create new relation (each inventory operation is separate)
    // For MOVE_ITEM, check if relation exists and update if it does
    const shouldCheckExisting = relationType !== 'INVENTORY_ITEM';
    
    let existing: Relation | undefined;
    if (shouldCheckExisting) {
      existing = await this.findRelation({
        sourceEntity: variantFullPaid,
        targetEntity: baseMoveFullBaid,
        type: relationType,
      });
    }

    const dataIn: Record<string, unknown> = {
      ...(opts?.dataIn || {}),
    };

    // Store quantity in temp_quantity until move is completed
    // Apply correct sign based on status
    if (opts?.tempQuantity !== undefined) {
      dataIn.temp_quantity = applyQuantitySign(opts.tempQuantity, opts?.statusName);
    }
    if (opts?.quantity !== undefined) {
      dataIn.quantity = applyQuantitySign(opts.quantity, opts?.statusName);
    }

    if (existing) {
      // Update existing relation (only for MOVE_ITEM)
      const existingDataIn = parseJson<Record<string, unknown>>(existing.dataIn, {});
      const mergedDataIn = {
        ...existingDataIn,
        ...dataIn,
      };

      await this.db
        .update(schema.relations)
        .set({
          dataIn: mergedDataIn,
          updatedAt: new Date(),
        })
        .where(eq(schema.relations.id, existing.id));

      return {
        ...existing,
        dataIn: mergedDataIn,
      };
    }

    // Create new relation
    const now = new Date();
    const [created] = await this.db
      .insert(schema.relations)
      .values({
        uuid: crypto.randomUUID(),
        sourceEntity: variantFullPaid,
        targetEntity: baseMoveFullBaid,
        type: relationType,
        statusName: opts?.statusName || 'ACTIVE',
        dataIn: dataIn,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  /**
   * Find relation
   */
  async findRelation(params: {
    sourceEntity?: string;
    targetEntity?: string;
    type?: string;
  }): Promise<Relation | undefined> {
    let conditions = [];
    
    if (params.sourceEntity) {
      conditions.push(eq(schema.relations.sourceEntity, params.sourceEntity));
    }
    if (params.targetEntity) {
      conditions.push(eq(schema.relations.targetEntity, params.targetEntity));
    }
    if (params.type) {
      conditions.push(eq(schema.relations.type, params.type));
    }

    if (conditions.length === 0) {
      return undefined;
    }

    const [relation] = await this.db
      .select()
      .from(schema.relations)
      .where(withNotDeleted(
        schema.relations.deletedAt,
        and(...conditions)
      ))
      .limit(1);

    return relation;
  }

  /**
   * Soft delete a relation by id
   */
  async softDeleteRelation(id: number): Promise<void> {
    await this.db
      .update(schema.relations)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.relations.id, id));
  }

  /**
   * Soft delete all relations for a base move
   * Deletes all relations where targetEntity matches the fullBaid
   */
  async softDeleteAllForBaseMove(fullBaid: string): Promise<void> {
    const now = new Date();
    
    await this.db
      .update(schema.relations)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.relations.targetEntity, fullBaid),
          notDeleted(schema.relations.deletedAt)
        )
      );
  }

  /**
   * Get products paid linked to location
   */
  async getProductsPaidByLocation(locationLaid: string): Promise<string[]> {
    const relations = await this.db
      .select({
        sourceEntity: schema.relations.sourceEntity,
      })
      .from(schema.relations)
      .where(withNotDeleted(
        schema.relations.deletedAt,
        and(
          eq(schema.relations.targetEntity, locationLaid),
          eq(schema.relations.type, 'PRODUCT_LOCATION')
        )
      ))
      .execute();

    return relations.map((r) => r.sourceEntity);
  }

  /**
   * Get relations for base move
   */
  async getRelationsForBaseMove(fullBaid: string): Promise<Relation[]> {
    return this.db
      .select()
      .from(schema.relations)
      .where(withNotDeleted(
        schema.relations.deletedAt,
        and(
          eq(schema.relations.targetEntity, fullBaid),
          eq(schema.relations.type, 'MOVE_ITEM')
        )
      ))
      .execute();
  }

  /**
   * Convert temp_quantity to quantity for all relations of a base move
   * Called when base move is completed
   */
  async confirmBaseMoveQuantities(fullBaid: string): Promise<void> {
    const relations = await this.getRelationsForBaseMove(fullBaid);

    for (const relation of relations) {
      const dataIn = parseJson<Record<string, unknown>>(relation.dataIn, {});
      
      // Move temp_quantity to quantity
      // The sign was already applied when temp_quantity was set, so just copy it
      if (dataIn.temp_quantity !== undefined) {
        dataIn.quantity = dataIn.temp_quantity;
        delete dataIn.temp_quantity;

        await this.db
          .update(schema.relations)
          .set({
            dataIn: dataIn,
            updatedAt: new Date(),
          })
          .where(eq(schema.relations.id, relation.id));
      }
    }
  }

  /**
   * Extract product paid from variant fullPaid
   * Variant fullPaid is either equal to product paid or starts with "product_paid-"
   */
  private extractProductPaid(variantFullPaid: string): string {
    // If variant contains a dash, take everything before the first dash
    const dashIndex = variantFullPaid.indexOf('-');
    if (dashIndex > 0) {
      // Check if there's another dash after the first one (e.g., "p-xxx-variant")
      const secondPart = variantFullPaid.substring(dashIndex + 1);
      const secondDashIndex = secondPart.indexOf('-');
      if (secondDashIndex > 0) {
        // Return prefix + first part (e.g., "p-xxx" from "p-xxx-variant")
        return variantFullPaid.substring(0, dashIndex + 1 + secondDashIndex);
      }
    }
    // If no dash or single-part ID, return as is (variant = product)
    return variantFullPaid;
  }

  /**
   * Get inventory aggregation for products
   * Returns inventory stats by product paid
   * Aggregates MOVE_ITEM relations by extracting product paid from variant fullPaid
   */
  async getInventoryAggregationByProducts(productPaids: string[]): Promise<Map<string, {
    available: number;
    in_transporting: number;
    unavailable: number;
    commited: number;
  }>> {
    if (productPaids.length === 0) {
      return new Map();
    }

    // Get all MOVE_ITEM relations that have confirmed quantities
    const allRelations = await this.db
      .select()
      .from(schema.relations)
      .where(withNotDeleted(
        schema.relations.deletedAt,
        inArray(schema.relations.type, ['MOVE_ITEM', 'INVENTORY_ITEM'])
      ))
      .execute();

    // Filter and aggregate
    const aggregation = new Map<string, {
      available: number;
      in_transporting: number;
      unavailable: number;
      commited: number;
    }>();

    // Initialize all products with zero values
    for (const paid of productPaids) {
      aggregation.set(paid, {
        available: 0,
        in_transporting: 0,
        unavailable: 0,
        commited: 0,
      });
    }

    // Process each relation
    for (const relation of allRelations) {
      // Extract product paid from variant fullPaid (source_entity)
      const variantFullPaid = relation.sourceEntity;
      const productPaid = this.extractProductPaid(variantFullPaid);
      
      // Skip if not in our product list
      if (!productPaids.includes(productPaid)) {
        continue;
      }

      const dataIn = parseJson<Record<string, unknown>>(relation.dataIn, {});
      const quantity = typeof dataIn.quantity === 'number' ? dataIn.quantity : 0;
      
      // Skip if no confirmed quantity
      if (!quantity) {
        continue;
      }

      const stats = aggregation.get(productPaid)!;
      const status = relation.statusName?.toUpperCase();

      // Categorize by status
      // Positive quantities are income, negative are expense/reserved
      if (status === 'IN_TRANSPORTING_INV') {
        stats.in_transporting += Math.abs(quantity);
      } else if (status === 'UNAVAILABLE') {
        stats.unavailable += Math.abs(quantity);
      } else if (status === 'COMMITTED_INV' || status === 'COMMITED_INV') {
        stats.commited += Math.abs(quantity);
      } else if (status === 'EXPENSE_INV') {
        // Expense reduces available (quantity is negative for EXPENSE)
        // Don't add to any category as it's already subtracted
      } else if (quantity > 0) {
        // Available: positive quantity (INCOME, CONFIRMED, etc.)
        stats.available += quantity;
      }
    }

    // Adjust available by reserving (committed) quantities
    for (const [paid, stats] of aggregation.entries()) {
      const adjustedAvailable = stats.available - stats.commited;
      aggregation.set(paid, {
        ...stats,
        available: adjustedAvailable,
      });
    }

    return aggregation;
  }
}


// Statuses that require negative quantity
const NEGATIVE_QUANTITY_STATUSES = new Set([
  'EXPENSE_INV',
  'UNAVAILABLE',
  'COMMITTED_INV',
  'DISPOSAL_INV',
  'IN_TRANSPORTING_INV',
]);

/**
 * Determine if quantity should be negative based on status
 */
function shouldBeNegative(statusName?: string): boolean {
  if (!statusName) return false;
  return NEGATIVE_QUANTITY_STATUSES.has(statusName.toUpperCase());
}

/**
 * Apply correct sign to quantity based on status
 */
function applyQuantitySign(quantity: number, statusName?: string): number {
  const absQuantity = Math.abs(quantity);
  return shouldBeNegative(statusName) ? -absQuantity : absQuantity;
}
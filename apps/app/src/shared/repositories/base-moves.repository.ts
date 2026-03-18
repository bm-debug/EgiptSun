import { and, eq, desc, or, inArray } from "drizzle-orm";
import type { D1Database, } from "@cloudflare/workers-types";
import { schema } from "../schema";
import type { BaseMove, Product } from "../schema/types";
import { createDb, parseJson, stringifyJson, notDeleted, withNotDeleted, type SiteDb } from "./utils";
import { generateAid } from "../generate-aid";
import { ProductsRepository } from "./products.repository";
import Relations from "../collections/relations";
import type {
  Sending,
  Receiving,
  SendingDataIn,
  ReceivingDataIn,
  InventoryItem,
  ProductExtendedDataIn,
  RelationInventory,
  RelationInventoryDataIn,
  ProductExtended
} from "@/shared/types/store";
import { WalletsRepository } from "./wallets.repository";
import BaseRepository from "./BaseRepositroy";
import { RelationsRepository } from "./relations.repository";
import { Relation } from "../schema/types";
import Products from "../collections/products";
import { HumanRepository } from "./human.repository";
import { sendPushNotificationToHuman } from "../utils/push";
import type { Env } from "../types";
type PaginatedResult<T> = {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
};

// InventoryItem теперь импортируется из types/24na7.ts

type BaseMoveData = {
  inventory?: RelationInventory[];
  inventory_list?: RelationInventory[];
  transportCost?: number;
  purchase_price_transport?: number;
  transportPercent?: number;
  transport_percent?: number;
  totalPurchasePrice?: number;
  totalPurchasePriceNet?: number;
  total_purchase_price?: number;
  total_purchase_price_net?: number;
  purchasePriceTransportPerItem?: number;
  purchase_price_transport_per_item?: number;
  itemsCount?: number;
  items_count?: number;
  skuCount?: number;
  SKU_count?: number;
  title?: string;
  date?: string;
  parent_full_baid?: string;
  parentFullBaid?: string;
  [key: string]: unknown;
};

export async function ensureInventory(db: SiteDb, baid: string): Promise<RelationInventory[]> {
  const relations = await db
    .select()
    .from(schema.relations)
    .where(withNotDeleted(schema.relations.deletedAt, eq(schema.relations.targetEntity, baid)))
    .execute() as RelationInventory[];

    const relationCollection = new Relations()
    const productCollection = new Products()

  for (const relation of relations) {
    const [product] = await db.select().from(schema.products).where(eq(schema.products.paid, relation.sourceEntity)).limit(1).execute()
    relation.product = productCollection.parse(product) as ProductExtended;
  }

  return relationCollection.parse<RelationInventory>(relations) as RelationInventory[];
}

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

/**
 * Safely get data_in / dataIn from relation.
 * Some records come with camelCase `dataIn` only, others with snake_case `data_in`.
 */
function getRelationDataIn(item: RelationInventory): RelationInventoryDataIn | undefined {
  return item.data_in ?? (item as any).dataIn;
}

/**
 * Ensure mutable reference to data_in, syncing camelCase/snake_case views.
 */
function ensureRelationDataIn(item: RelationInventory): RelationInventoryDataIn {
  const existing = getRelationDataIn(item);
  if (existing) {
    // Keep both references in sync
    item.data_in = existing;
    (item as any).dataIn = existing;
    return existing;
  }
  const created = {} as RelationInventoryDataIn;
  item.data_in = created;
  (item as any).dataIn = created;
  return created;
}

function getRelationSourceEntity(item: { sourceEntity?: unknown; source_entity?: unknown }): string {
  if (item && typeof item === "object") {
    if (typeof item.sourceEntity === "string" && item.sourceEntity) {
      return item.sourceEntity;
    }

    const legacyValue = (item as { source_entity?: unknown }).source_entity;
    if (typeof legacyValue === "string" && legacyValue) {
      return legacyValue;
    }
  }

  return "";
}

export class BaseMovesRepository extends BaseRepository<BaseMove> {
  private static instance: BaseMovesRepository | null = null;

  private constructor() {
    super(schema.baseMoves);
  }

  public static getInstance(): BaseMovesRepository {
    if (!BaseMovesRepository.instance) {
      BaseMovesRepository.instance = new BaseMovesRepository();
    }
    return BaseMovesRepository.instance;
  }

  async findByUuid(uuid: string): Promise<BaseMove> {
    const [move] = await this.db
      .select()
      .from(schema.baseMoves)
      .where(withNotDeleted(schema.baseMoves.deletedAt, eq(schema.baseMoves.uuid, uuid)))
      .limit(1);

    return move as BaseMove;
  }

  async findPaginated(options: {
    page?: number;
    limit?: number;
  }): Promise<{
    docs: BaseMove[];
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
      .select({ count: schema.baseMoves.id })
      .from(schema.baseMoves)
      .where(notDeleted(schema.baseMoves.deletedAt))
      .execute();

    const totalDocs = countResult.length;

    // Get paginated data (excluding soft-deleted)
    const docs = await this.db
      .select()
      .from(schema.baseMoves)
      .where(notDeleted(schema.baseMoves.deletedAt))
      .orderBy(desc(schema.baseMoves.id))
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

  async recalculateReceivingMetrics(fullBaid: string): Promise<BaseMove | null> {
    const move = await this.findByFullBaid(fullBaid);
    if (!move) {
      return null;
    }

    const data =  move.dataIn as BaseMoveData

    // Check if this is a Receiving move by structure (laid_to filled, laid_from empty)
    const isReceiving = (move.laidTo && !move.laidFrom) || data.type === 'RECEIVING';
    if (!isReceiving) {
      return move;
    }

    const inventoryList = await ensureInventory(this.db, fullBaid);

    let totalItems = 0;
    const uniqueSkus = new Set<string>();

    inventoryList.forEach((item: RelationInventory) => {
      const dataIn = getRelationDataIn(item);
      if (!dataIn) {
        return;
      }
      const quantity = toNumber(dataIn.quantity ?? dataIn.temp_quantity);
      if (!quantity) {
        return;
      }

      totalItems += quantity;

      const variantKey = getRelationSourceEntity(item);

      if (variantKey) {
        uniqueSkus.add(variantKey);
      }
    });

    const rawPurchaseCost =
      toNumber(
        data.purchase_price_transport ??
        data.transportCost ??
        0
      );

    const purchaseCost = Math.round(rawPurchaseCost);
    const purchaseCostPerItem = totalItems ? Math.round(purchaseCost / totalItems) : 0;

    data.total_purchase_price_net = purchaseCost;
    data.totalPurchasePriceNet = purchaseCost;
    data.total_purchase_price = purchaseCost;
    data.totalPurchasePrice = purchaseCost;
    data.purchase_price_transport = purchaseCost;
    data.transportCost = purchaseCost;
    data.purchase_price_transport_per_item = purchaseCostPerItem;
    data.purchasePriceTransportPerItem = purchaseCostPerItem;
    delete data.transport_percent;
    delete data.transportPercent;
    data.items_count = totalItems;
    data.itemsCount = totalItems;
    data.SKU_count = uniqueSkus.size;
    data.skuCount = uniqueSkus.size;
    data.inventory_list = inventoryList;

    // For JSONB, we pass the object directly
    const serialized = data; 

    await this.db
      .update(schema.baseMoves)
      .set({
        dataIn: serialized,
      })
      .where(eq(schema.baseMoves.id, move.id));

    return {
      ...move,
      dataIn: serialized ?? move.dataIn,
    };
  }

  async upsertReceivingDraft(sourceFullBaid: string, payload: Partial<BaseMove> = {}): Promise<BaseMove> {
    const source = await this.findByFullBaid(sourceFullBaid);
    if (!source) {
      throw new Error(`Base move with full_baid ${sourceFullBaid} not found`);
    }

    const receivingFullDaid = (payload.fullDaid ?? source.fullDaid ?? `${source.fullBaid}:RECEIVING`) as string;

    const [existing] = await this.db
      .select()
      .from(schema.baseMoves)
      .where(
        and(
          eq(schema.baseMoves.statusName, "RECEIVING"),
          eq(schema.baseMoves.fullDaid, receivingFullDaid)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const newData = parseJson<BaseMoveData>(source.dataIn, {} as BaseMoveData);
    if (source.fullBaid) {
      newData.parentFullBaid = source.fullBaid;
      newData.parent_full_baid = source.fullBaid;
    }

    const [created] = await this.db
      .insert(schema.baseMoves)
      .values({
        uuid: payload.uuid ?? crypto.randomUUID(),
        fullBaid: payload.fullBaid ?? `${source.fullBaid}-RECEIVING`,
        baid: payload.baid ?? source.baid,
        fullDaid: receivingFullDaid,
        laidFrom: payload.laidFrom ?? source.laidFrom,
        laidTo: payload.laidTo ?? source.laidTo,
        title: payload.title ?? source.title,
        statusName: payload.statusName ?? "RECEIVING",
        dataIn: newData, // Pass object directly
        dataOut: payload.dataOut ?? source.dataOut,
      })
      .returning();

    return created;
  }

  async mapTransitingProduct(
    product: { name?: string | null } | null,
    locA: { title?: string | null } | null,
    locB: { title?: string | null } | null
  ): Promise<{ product: Product | typeof product }> {
    if (!product?.name || !locA?.title || !locB?.title) {
      return { product: product as typeof product };
    }

    const fromPrefix = `${locA.title}#`;
    const toPrefix = `${locB.title}#`;

    if (!product.name.startsWith(fromPrefix)) {
      return { product: product as typeof product };
    }

    const candidateTitle = product.name.replace(fromPrefix, toPrefix);

    const [byTitle] = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.title, candidateTitle))
      .limit(1);

    if (byTitle) {
      return { product: byTitle };
    }

    const [byPaid] = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.paid, candidateTitle))
      .limit(1);

    if (byPaid) {
      return { product: byPaid };
    }

    return { product: product as typeof product };
  }

  /**
   * Find paginated base moves by location with optional type filter
   * Can filter by laidTo, laidFrom, or both
   */
  async findByLocation(params: {
    laidTo?: string;
    laidFrom?: string;
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<PaginatedResult<BaseMove>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let allMoves;

    if (params.laidTo && params.laidFrom) {
      // Filter by both laidTo and laidFrom
      allMoves = await this.db
        .select()
        .from(schema.baseMoves)
        .where(withNotDeleted(
          schema.baseMoves.deletedAt,
          or(
            eq(schema.baseMoves.laidTo, params.laidTo),
            eq(schema.baseMoves.laidFrom, params.laidFrom)
          )
        ))
        .orderBy(desc(schema.baseMoves.id));
        // Removed .all(), use default execute() which returns Promise<T[]> in postgres-js
    } else if (params.laidTo) {
      // Filter by laidTo only
      allMoves = await this.db
        .select()
        .from(schema.baseMoves)
        .where(withNotDeleted(
          schema.baseMoves.deletedAt,
          eq(schema.baseMoves.laidTo, params.laidTo)
        ))
        .orderBy(desc(schema.baseMoves.id));
    } else if (params.laidFrom) {
      // Filter by laidFrom only
      allMoves = await this.db
        .select()
        .from(schema.baseMoves)
        .where(withNotDeleted(
          schema.baseMoves.deletedAt,
          eq(schema.baseMoves.laidFrom, params.laidFrom)
        ))
        .orderBy(desc(schema.baseMoves.id));
    } else {
      // No location filter
      allMoves = await this.db
        .select()
        .from(schema.baseMoves)
        .where(notDeleted(schema.baseMoves.deletedAt))
        .orderBy(desc(schema.baseMoves.id));
    }

    const executedMoves = allMoves;

    // Filter by type if specified
    let filteredMoves = executedMoves;
    if (params.type) {
      filteredMoves = executedMoves.filter((move) => {
        if (!move.dataIn) return false;
        try {
          const data = parseJson<BaseMoveData>(move.dataIn, {} as BaseMoveData);
          return data.type === params.type;
        } catch {
          return false;
        }
      });
    }

    const totalDocs = filteredMoves.length;
    const totalPages = Math.ceil(totalDocs / limit);
    const docs = filteredMoves.slice(offset, offset + limit);

    return {
      docs,
      totalDocs,
      limit,
      totalPages,
      page,
      pagingCounter: offset + 1,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
    };
  }

  /**
   * Create a new receiving base move
   */
  async createReceiving(data: {
    title?: string;
    transportCost?: number;
    transportPrice?: number;
    date?: string;
    ownerEaid?: string;
    locationLaid?: string;
    laidFrom?: string;
    laidTo?: string;
    location?: any;
    sendingBaid?: string;
  }): Promise<BaseMove> {
    const uuid = crypto.randomUUID();
    const fullBaid = generateAid('b');

    const transportAmount = data.transportPrice || data.transportCost || 0;

    // Используем типизированный ReceivingDataIn вместо BaseMoveData
    const dataIn: ReceivingDataIn = {
      purchase_price_transport: transportAmount,
      transportCost: transportAmount,
      inventory_list: [],
      type: 'RECEIVING',
    };

    // Add optional fields only if they exist
    if (data.title) dataIn.title = data.title;
    if (data.date) dataIn.date = data.date;
    if (data.ownerEaid) dataIn.owner_eaid = data.ownerEaid;
    if (data.locationLaid) dataIn.location_laid = data.locationLaid;
    if (data.location) dataIn.location = data.location;
    if (data.sendingBaid) dataIn.sending_baid = data.sendingBaid;

    const now = new Date();

    const [created] = await this.db
      .insert(schema.baseMoves)
      .values({
        uuid,
        fullBaid,
        title: data.title || 'Новая входящая машина',
        statusName: 'IN_PROGRESS',
        laidFrom: data.laidFrom,
        laidTo: data.laidTo || data.locationLaid,
        dataIn: dataIn, // Object directly
        xaid: data.ownerEaid,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  /**
   * Get base move by full_baid (excluding soft-deleted)
   */
  async findByFullBaid(fullBaid: string): Promise<BaseMove | null> {
    const [baseMove] = await this.db
      .select()
      .from(schema.baseMoves)
      .where(withNotDeleted(
        schema.baseMoves.deletedAt,
        eq(schema.baseMoves.fullBaid, fullBaid)
      ))
      .limit(1);

    return baseMove || null;
  }

  /**
   * Soft delete a base move by UUID
   * Also deletes all related relations and receiving if this is a sending
   */
  async softDelete(uuid: string): Promise<boolean> {
    const existing = await this.findByUuid(uuid);
    if (!existing || !existing.fullBaid) {
      return false;
    }

    return this.softDeleteByFullBaid(existing.fullBaid);
  }

  /**
   * Soft delete a base move by fullBaid
   * Also deletes all related relations and receiving if this is a sending
   */
  async softDeleteByFullBaid(fullBaid: string): Promise<boolean> {
    const existing = await this.findByFullBaid(fullBaid);
    if (!existing) {
      return false;
    }

    const now = new Date();

    // 1. Delete all relations where this base_move is the target (inventory items)
    try {
      const { RelationsRepository } = await import('./relations.repository');
      const relationsRepo = RelationsRepository.getInstance();

      // Soft delete all relations for this base_move in one query
      await relationsRepo.softDeleteAllForBaseMove(fullBaid);
    } catch (error) {
      console.error('Failed to delete relations for base_move:', error);
      // Continue with deletion even if relation cleanup fails
    }

    // 2. If this is a sending, delete the related receiving
    try {
      const data = parseJson<SendingDataIn>(existing.dataIn, {} as SendingDataIn);

      // Check if this is a sending by checking if it has laid_from but not laid_to
      // or has type: 'SENDING'
      const isSending = data.type === 'SENDING' || (existing.laidFrom && !existing.laidTo);

      if (isSending) {
        // Find related receiving by sending_baid
        const relatedReceiving = await this.findReceivingBySendingBaid(fullBaid);

        if (relatedReceiving && relatedReceiving.fullBaid) {
          // Delete relations for receiving first
          const { RelationsRepository } = await import('./relations.repository');
          const relationsRepo = RelationsRepository.getInstance();

          // Soft delete all relations for receiving in one query
          await relationsRepo.softDeleteAllForBaseMove(relatedReceiving.fullBaid);

          // Delete the receiving itself
          await this.db
            .update(schema.baseMoves)
            .set({
              deletedAt: now,
              updatedAt: now,
            })
            .where(eq(schema.baseMoves.id, relatedReceiving.id));
        }
      }
    } catch (error) {
      console.error('Failed to delete related receiving:', error);
      // Continue with deletion even if receiving cleanup fails
    }

    // 3. Finally, delete the base_move itself
    await this.db
      .update(schema.baseMoves)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.baseMoves.id, existing.id));

    return true;
  }

  /**
   * Get inventory items for a base move
   */
  async getInventoryItems(fullBaid: string): Promise<RelationInventory[]> {
    const baseMove = await this.findByFullBaid(fullBaid);
    if (!baseMove) {
      return [];
    }

    const data = parseJson<BaseMoveData>(baseMove.dataIn, {} as BaseMoveData);
    return await ensureInventory(this.db, fullBaid);
  }

  /**
   * Add inventory item to base move
   */
  async addInventoryItem(
    fullBaid: string,
    item: { variantFullPaid: string; quantity: number },
    isManager: boolean = false
  ): Promise<BaseMove | null> {
    const baseMove = await this.findByFullBaid(fullBaid);
    if (!baseMove || (baseMove.statusName !== 'IN_PROGRESS' && !isManager)) {
      return null;
    }

    const data = parseJson<BaseMoveData>(baseMove.dataIn, {} as BaseMoveData);



    await this.db
      .update(schema.baseMoves)
      .set({
        dataIn: data, // Object
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, baseMove.id));

    // Create relation between variant and base_move with temp_quantity
    try {
      const { RelationsRepository } = await import('./relations.repository');
      const relationsRepo = RelationsRepository.getInstance();
      await relationsRepo.linkVariantToBaseMove(
        item.variantFullPaid,
        fullBaid,
        {
          type: 'MOVE_ITEM',
          statusName: 'INCOME_INV',
          tempQuantity: item.quantity,
          quantity: isManager ? item.quantity : undefined,
          dataIn: {
            addedAt: new Date().toISOString(), // Keeping string for internal JSON field if strict format needed, or change to Date if preferred
          },
        }
      );
    } catch (error) {
      console.error('Failed to create relation for inventory item:', error);
      // Don't fail the whole operation if relation creation fails
    }

    // Recalculate metrics if this is a receiving move
    const isReceiving = (baseMove.laidTo && !baseMove.laidFrom) || data.type === 'RECEIVING';
    if (isReceiving) {
      await this.recalculateReceivingMetrics(fullBaid);
    }

    const result = await this.findByFullBaid(fullBaid);
    return result || null;
  }

  /**
   * Remove inventory item from base move
   */
  async removeInventoryItem(fullBaid: string, itemUuid: string, isManager: boolean = false): Promise<BaseMove | null> {
    const baseMove = await this.findByFullBaid(fullBaid);
    if (!baseMove || (baseMove.statusName !== 'IN_PROGRESS' && !isManager)) {
      return null;
    }
    const relationRepository = RelationsRepository.getInstance();
    const variantFullPaid = (await relationRepository.findByUuid(itemUuid)
      .then((relation: Relation) => relation.sourceEntity));


    // Soft delete relation between variant and base_move
    if (variantFullPaid && fullBaid) {
      try {
        const { RelationsRepository } = await import('./relations.repository');
        const relationsRepo = RelationsRepository.getInstance();
        const relation = await relationsRepo.findRelation({
          sourceEntity: variantFullPaid,
          targetEntity: fullBaid,
          type: 'MOVE_ITEM',
        });
        if (relation) {
          await relationsRepo.softDeleteRelation(relation.id);
        }
      } catch (error) {
        console.error('Failed to delete relation for inventory item:', error);
        // Don't fail the whole operation if relation deletion fails
      }
    }

    // Recalculate metrics and sync with related move
    if (fullBaid) {
      try {
        const move = await this.findByFullBaid(fullBaid);
        if (move) {
          const moveData = parseJson<BaseMoveData>(move.dataIn, {} as BaseMoveData);

          // Check if this is a receiving move
          const isReceiving = (move.laidTo && !move.laidFrom) || moveData.type === 'RECEIVING';
          if (isReceiving) {
            // Recalculate receiving metrics
            await this.recalculateReceivingMetrics(fullBaid);
          } else if (move.laidFrom && !move.laidTo) {
            // Check if this is a sending move - sync to receiving
            await this.syncSendingToReceiving(fullBaid);
          }
        }
      } catch (error) {
        console.error('Failed to recalculate metrics or sync after item removal:', error);
        // Don't fail the operation if sync fails
      }
    }

    const result = await this.findByFullBaid(fullBaid);
    return result || null;
  }

  /**
   * Send base move for approval
   */
  async sendForApproval(fullBaid: string, context :any): Promise<BaseMove | null> {
    const baseMove = await this.findByFullBaid(fullBaid);
    if (!baseMove || baseMove.statusName !== 'IN_PROGRESS') {
      return null;
    }

    const moveData = parseJson<BaseMoveData>(baseMove.dataIn, {} as BaseMoveData);
    const isSendingMove =
      (!!baseMove.laidFrom && !baseMove.laidTo) ||
      moveData.type === 'SENDING';

    await this.db
      .update(schema.baseMoves)
      .set({
        statusName: 'ON_APPROVAL',
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, baseMove.id));

      let title = 'Новое';
      let url = '/m'
      switch (moveData.type) {
        case 'SENDING':
          title = 'Новое отправление';
          url = `/m/sending/edit?full_baid=${fullBaid}`
          break;
        case 'RECEIVING':
          title = 'Новая входящая машина';
          url = `/m/receiving/edit?full_baid=${fullBaid}`
          break;
      }

    await this.sendPushToManager(
      title, 
      `Новая машина ${moveData.title} на подтверждение`, 
      context,
      url);
    return baseMove;
  }
  async updateReceiving(uuid: string, data: { title?: string; transportCost?: number; date?: string }): Promise<BaseMove | null> {
    const existing = await this.findByUuid(uuid);
    if (!existing) {
      return null;
    }

    const existingData = parseJson<BaseMoveData>(existing.dataIn, {} as BaseMoveData);

    const updatedData: BaseMoveData = {
      ...existingData,
      title: data.title !== undefined ? data.title : existingData.title,
      date: data.date !== undefined ? data.date : existingData.date,
      purchase_price_transport: data.transportCost !== undefined ? data.transportCost : existingData.purchase_price_transport,
      transportCost: data.transportCost !== undefined ? data.transportCost : existingData.transportCost,
    };

    await this.db
      .update(schema.baseMoves)
      .set({
        title: data.title !== undefined ? data.title : existing.title,
        dataIn: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, existing.id));

    // Recalculate receiving metrics after update
    if (existing.fullBaid) {
      await this.recalculateReceivingMetrics(existing.fullBaid);
    }

    const result = await this.findByUuid(uuid);
    return result || null;
  }

  /**
   * Update an existing receiving base move by fullBaid
   */
  async updateReceivingByFullBaid(
    fullBaid: string,
    data: {
      title?: string;
      transportCost?: number;
      date?: string;

    },
    isManager: boolean = false
  ): Promise<BaseMove | null> {
    const existing = await this.findByFullBaid(fullBaid);
    if (!existing || (existing.statusName !== 'IN_PROGRESS' && !isManager)) {
      return null;
    }

    const existingData = parseJson<BaseMoveData>(existing.dataIn, {} as BaseMoveData);

    const updatedData: BaseMoveData = {
      ...existingData,
    };

    if (data.title !== undefined) updatedData.title = data.title;
    if (data.date !== undefined) updatedData.date = data.date;
    if (data.transportCost !== undefined) {
      updatedData.purchase_price_transport = data.transportCost;
      updatedData.transportCost = data.transportCost;
    }

    await this.db
      .update(schema.baseMoves)
      .set({
        title: data.title !== undefined ? data.title : existing.title,
        dataIn: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, existing.id));

    // Recalculate receiving metrics after update
    await this.recalculateReceivingMetrics(fullBaid);

    const result = await this.findByFullBaid(fullBaid);
    return result || null;
  }

  /**
   * Create or find an existing inventory move for a location
   * Returns an in-progress inventory base_move for the location
   */
  async createOrUseInventoryMove(
    locationLaid: string,
    opts?: {
      title?: string;
      ownerEaid?: string;
    }
  ): Promise<BaseMove> {
    // Try to find an existing in-progress inventory move for this location
    const existingMoves = await this.db
      .select()
      .from(schema.baseMoves)
      .where(
        and(
          eq(schema.baseMoves.laidTo, locationLaid),
          eq(schema.baseMoves.statusName, 'IN_PROGRESS'),
          notDeleted(schema.baseMoves.deletedAt)
        )
      )
      .orderBy(desc(schema.baseMoves.id))
      .limit(10);

    // Check if any of these moves is an inventory move
    for (const move of existingMoves) {
      const data = parseJson<BaseMoveData>(move.dataIn, {} as BaseMoveData);
      if (data.type === 'INVENTORY') {
        return move;
      }
    }

    // Create a new inventory move
    const uuid = crypto.randomUUID();
    const fullBaid = generateAid('b');

    const dataIn: BaseMoveData = {
      type: 'INVENTORY',
      inventory_list: [],
      title: opts?.title || 'Инвентаризация',
      location_laid: locationLaid,
    };

    if (opts?.ownerEaid) {
      dataIn.owner_eaid = opts.ownerEaid;
    }

    const now = new Date();

    const [created] = await this.db
      .insert(schema.baseMoves)
      .values({
        uuid,
        fullBaid,
        title: opts?.title || 'Инвентаризация',
        statusName: 'COMPLETED',
        laidTo: locationLaid,
        dataIn: dataIn,
        xaid: opts?.ownerEaid,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  /**
   * Add inventory to location with specified status
   * Creates or uses an existing inventory move and adds the item
   */
  async addInventoryToLocation(opts: {
    locationLaid: string;
    variantFullPaid: string;
    quantity: number;
    status: string;
    notes?: string;
    ownerEaid?: string;
  }): Promise<BaseMove | null> {
    // Get or create inventory move
    const inventoryMove = await this.createOrUseInventoryMove(
      opts.locationLaid,
      {
        ownerEaid: opts.ownerEaid,
      }
    );

    const data = parseJson<BaseMoveData>(inventoryMove.dataIn, {} as BaseMoveData);
    const inventory = await ensureInventory(this.db, inventoryMove.fullBaid as string);


    // Update counts
    data.items_count = inventory.reduce((sum, item) => {
      const dataIn = getRelationDataIn(item);
      if (!dataIn) {
        return sum;
      }
      const qty = toNumber(dataIn.quantity ?? dataIn.temp_quantity);
      return sum + qty;
    }, 0);

    const uniqueSkus = new Set<string>();
    inventory.forEach(item => {
      const variantKey = getRelationSourceEntity(item);
      if (variantKey) {
        uniqueSkus.add(variantKey);
      }
    });
    data.SKU_count = uniqueSkus.size;
    data.skuCount = uniqueSkus.size;

    await this.db
      .update(schema.baseMoves)
      .set({
        dataIn: data,
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, inventoryMove.id));

    // Create relation between variant and location with temp_quantity
    if (inventoryMove.fullBaid) {
      try {
        const { RelationsRepository } = await import('./relations.repository');
        const relationsRepo = RelationsRepository.getInstance();
        await relationsRepo.linkVariantToBaseMove(
          opts.variantFullPaid,
          inventoryMove.fullBaid,
          {
            type: 'INVENTORY_ITEM',
            statusName: opts.status,
            quantity: opts.quantity, // Store in temp_quantity until confirmed
            dataIn: {
              notes: opts.notes,
              addedAt: new Date().toISOString(),
            },
          }
        );
      } catch (error) {
        console.error('Failed to create relation for inventory item:', error);
        // Don't fail the whole operation if relation creation fails
      }
    }

    if (!inventoryMove.fullBaid) {
      return null;
    }

    const result = await this.findByFullBaid(inventoryMove.fullBaid);
    return result || null;
  }

  /**
   * Create a new sending base move
   */
  async createSending(data: {
    title?: string;
    date?: string;
    ownerEaid?: string;
    laidFrom?: string;
    laidTo?: string;
    contractorCaid?: string;
    transportPrice?: number;
  }): Promise<BaseMove> {
    const uuid = crypto.randomUUID();
    const fullBaid = generateAid('b');

    // Используем типизированный SendingDataIn вместо BaseMoveData
    const dataIn: SendingDataIn = {
      type: 'SENDING',
      inventory_list: [],
    };

    // Add optional fields only if they exist
    if (data.title) dataIn.title = data.title;
    if (data.date) dataIn.date = data.date;
    if (data.ownerEaid) dataIn.owner_eaid = data.ownerEaid;
    if (data.laidFrom) dataIn.location_laid = data.laidFrom;
    if (data.contractorCaid) dataIn.contractor_caid = data.contractorCaid;
    if (data.transportPrice !== undefined) {
      dataIn.transport_price = data.transportPrice;
      dataIn.transportPrice = data.transportPrice;
    }

    const now = new Date();

    const [created] = await this.db
      .insert(schema.baseMoves)
      .values({
        uuid,
        fullBaid,
        title: data.title || 'Новая отправка',
        statusName: 'IN_PROGRESS',
        laidFrom: data.laidFrom,
        laidTo: data.laidTo,
        dataIn: dataIn,
        xaid: data.ownerEaid,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  /**
   * Add sending item to base move
   * Creates EXPENSE_INV entry and creates relation
   */
  async addSendingItem(
    fullBaid: string,
    item: {
      variantFullPaid: string;
      quantity: number;
      sellingPriceFact?: number;
      purchasePriceFact?: number;
      notes?: string;
    }
  ): Promise<BaseMove | null> {
    const baseMove = await this.findByFullBaid(fullBaid);
    if (!baseMove || baseMove.statusName !== 'IN_PROGRESS') {
      return null;
    }

    const data = parseJson<BaseMoveData>(baseMove.dataIn, {} as BaseMoveData);
    const inventory = await ensureInventory(this.db, baseMove.fullBaid as string);

    // TODO: Validate available quantity (optional)
    // This would require checking inventory levels at the source location


    await this.db
      .update(schema.baseMoves)
      .set({
        dataIn: data,
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, baseMove.id));

    // Create relation between variant and base_move with temp_quantity
    try {
      const { RelationsRepository } = await import('./relations.repository');
      const relationsRepo = RelationsRepository.getInstance();
      await relationsRepo.linkVariantToBaseMove(
        item.variantFullPaid,
        fullBaid,
        {
          type: 'MOVE_ITEM',
          statusName: 'EXPENSE_INV',
          tempQuantity: item.quantity, // Store in temp_quantity until confirmed (will be negative)
          dataIn: {
            sellingPriceFact: item.sellingPriceFact,
            purchasePriceFact: item.purchasePriceFact,
            addedAt: new Date().toISOString(),
          },
        }
      );
    } catch (error) {
      console.error('Failed to create relation for sending item:', error);
      // Don't fail the whole operation if relation creation fails
    }

    // Recalculate metrics after adding item
    await this.recalculateSendingMetrics(fullBaid);

    // Sync with related receiving if exists
    try {
      await this.syncSendingToReceiving(fullBaid);
    } catch (error) {
      console.error('Failed to sync sending to receiving:', error);
      // Don't fail the operation if sync fails
    }

    const result = await this.findByFullBaid(fullBaid);
    return result || null;
  }

  /**
   * Recalculate sending metrics
   * Calculates total prices, counts, etc.
   */
  async recalculateSendingMetrics(fullBaid: string): Promise<BaseMove | null> {
    const move = await this.findByFullBaid(fullBaid);
    if (!move) {
      return null;
    }

    const data = parseJson<SendingDataIn & BaseMoveData>(
      move.dataIn,
      {} as SendingDataIn & BaseMoveData
    );

    const isSending = data.type === 'SENDING' || (move.laidFrom && !move.laidTo);
    if (!isSending) {
      return move;
    }

    const inventoryList = await ensureInventory(this.db, move.fullBaid as string);
    const transportPrice = toNumber(data.transport_price ?? data.transportPrice ?? 0);

    if (!inventoryList.length) {
      data.transport_price = transportPrice;
      data.transportPrice = transportPrice;
      data.total_selling_price_net = 0;
      data.total_selling_price = 0;
      data.total_purchase_price = 0;
      data.margin_amount = 0;
      data.margin_to_purchase_price = 0;
      data.margin_to_selling_price = 0;
      data.total_selling_price_fact = 0;
      data.total_purchase_price_fact = 0;
      data.total_price = 0;
      data.cost_price = 0;
      data.items_count = 0;
      data.itemsCount = 0;
      data.SKU_count = 0;
      data.skuCount = 0;
      data.articles_count = 0;
      data.positions_count = 0;
      data.inventory_list = [];

      const serialized = data;

      await this.db
        .update(schema.baseMoves)
        .set({
          dataIn: serialized,
          updatedAt: new Date(),
        })
        .where(eq(schema.baseMoves.id, move.id));

      return {
        ...move,
        dataIn: serialized ?? move.dataIn,
      };
    }

    let totalItems = 0;
    let totalSellingPriceFact = 0;
    let totalPurchasePriceFact = 0;
    const uniqueSkus = new Set<string>();
    const productPaidSet = new Set<string>();

    inventoryList.forEach((item) => {
      const dataIn = getRelationDataIn(item);
      if (!dataIn) {
        return;
      }
      const quantity = Math.abs(toNumber(dataIn.quantity ?? dataIn.temp_quantity));
      if (!quantity) {
        return;
      }

      totalItems += quantity;

      const variantKey = getRelationSourceEntity(item);

      if (variantKey) {
        uniqueSkus.add(variantKey);
        productPaidSet.add(variantKey);
      }

      const sellingPriceFact = toNumber(dataIn.selling_price);
      const purchasePriceFact = toNumber(dataIn.purchase_price);

      if (sellingPriceFact > 0) {
        totalSellingPriceFact += sellingPriceFact * quantity;
      }

      if (purchasePriceFact > 0) {
        totalPurchasePriceFact += purchasePriceFact * quantity;
      }
    });

    const productPrices = new Map<string, ProductExtendedDataIn>();
    const productPaidList = Array.from(productPaidSet);

    if (productPaidList.length === 1) {
      const [product] = await this.db
        .select()
        .from(schema.products)
        .where(
          withNotDeleted(
            schema.products.deletedAt,
            eq(schema.products.paid, productPaidList[0])
          )
        )
        .limit(1);

      if (product && product.paid) {
        const parsed = parseJson<ProductExtendedDataIn>(
          product.dataIn as string | null,
          {} as ProductExtendedDataIn
        );
        productPrices.set(product.paid, parsed);
      }
    } else if (productPaidList.length > 1) {
      const products = await this.db
        .select()
        .from(schema.products)
        .where(
          withNotDeleted(
            schema.products.deletedAt,
            inArray(schema.products.paid, productPaidList)
          )
        )
        .execute();

      products.forEach((product) => {
        if (!product?.paid) {
          return;
        }
        const parsed = parseJson<ProductExtendedDataIn>(
          product.dataIn as string | null,
          {} as ProductExtendedDataIn
        );
        productPrices.set(product.paid, parsed);
      });
    }

    let totalSellingPriceNet = 0;
    let totalPurchasePrice = 0;

    inventoryList.forEach((item) => {
      const dataIn = getRelationDataIn(item);
      if (!dataIn) {
        return;
      }
      const quantity = Math.abs(toNumber(dataIn.quantity ?? dataIn.temp_quantity));
      if (!quantity) {
        return;
      }

      const variantKey = getRelationSourceEntity(item);

      if (!variantKey) {
        return;
      }

      const productData = productPrices.get(variantKey) || ({} as ProductExtendedDataIn);
      const sellingPricePerItem = toNumber(
        productData.average_purchase_price ??
        productData.price ??
        productData.average_purchase_price_net ??
        0
      );
      const purchasePricePerItem = toNumber(
        productData.average_purchase_price_net ??
        productData.average_purchase_price ??
        productData.price ??
        0
      );

      totalSellingPriceNet += sellingPricePerItem * quantity;
      totalPurchasePrice += purchasePricePerItem * quantity;

      if (sellingPricePerItem) {
        const targetDataIn = ensureRelationDataIn(item);
        const currentPurchasePrice = toNumber(targetDataIn.purchase_price);
        if (!currentPurchasePrice) {
          targetDataIn.purchase_price = sellingPricePerItem;
        }
      }

      if (purchasePricePerItem) {
        const targetDataIn = ensureRelationDataIn(item);
        const currentPurchasePriceNet = toNumber(targetDataIn.purchase_price_net);
        if (!currentPurchasePriceNet) {
          targetDataIn.purchase_price_net = purchasePricePerItem;
        }
      }
    });

    const totalSellingPrice = totalSellingPriceNet + transportPrice;
    const marginAmount = totalSellingPrice - totalPurchasePrice;
    const marginToPurchase = totalPurchasePrice
      ? (marginAmount / totalPurchasePrice) * 100
      : 0;
    const marginToSelling = totalSellingPrice
      ? (marginAmount / totalSellingPrice) * 100
      : 0;

    data.transport_price = transportPrice;
    data.transportPrice = transportPrice;
    data.total_selling_price_net = Math.round(totalSellingPriceNet);
    data.total_selling_price = Math.round(totalSellingPrice);
    data.total_purchase_price = Math.round(totalPurchasePrice);
    data.margin_amount = Math.round(marginAmount);
    data.margin_to_purchase_price = Number.isFinite(marginToPurchase)
      ? Math.round(marginToPurchase * 100) / 100
      : 0;
    data.margin_to_selling_price = Number.isFinite(marginToSelling)
      ? Math.round(marginToSelling * 100) / 100
      : 0;

    data.total_selling_price_fact = Math.round(totalSellingPriceFact);
    data.total_purchase_price_fact = Math.round(totalPurchasePriceFact);

    data.items_count = totalItems;
    data.itemsCount = totalItems;
    data.SKU_count = uniqueSkus.size;
    data.skuCount = uniqueSkus.size;
    data.total_price = data.total_selling_price;
    data.cost_price = data.total_purchase_price;
    data.articles_count = uniqueSkus.size;
    data.positions_count = totalItems;

    const serialized = data;

    await this.db
      .update(schema.baseMoves)
      .set({
        dataIn: serialized,
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, move.id));


    const walletsRepo = WalletsRepository.getInstance();
    if (move.statusName === 'COMPLETED') {
      await walletsRepo.genreateTransactionForSending(move as Sending);
    }
    return {
      ...move,
      dataIn: serialized ?? move.dataIn,
    };
  }

  /**
   * Update an existing sending base move by fullBaid
   */
  async updateSendingByFullBaid(
    fullBaid: string,
    data: {
      title?: string;
      date?: string;
      laidTo?: string;
      contractorCaid?: string;
      transportPrice?: number;
    }
  ): Promise<BaseMove | null> {
    const existing = await this.findByFullBaid(fullBaid);
    if (!existing || existing.statusName !== 'IN_PROGRESS') {
      return null;
    }

    const existingData = parseJson<BaseMoveData>(existing.dataIn, {} as BaseMoveData);

    const updatedData: BaseMoveData = {
      ...existingData,
    };

    if (data.title !== undefined) updatedData.title = data.title;
    if (data.date !== undefined) updatedData.date = data.date;
    if (data.contractorCaid !== undefined) updatedData.contractor_caid = data.contractorCaid;
    if (data.transportPrice !== undefined) {
      updatedData.transport_price = data.transportPrice;
      updatedData.transportPrice = data.transportPrice;
    }

    await this.db
      .update(schema.baseMoves)
      .set({
        title: data.title !== undefined ? data.title : existing.title,
        laidTo: data.laidTo !== undefined ? data.laidTo : existing.laidTo,
        dataIn: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, existing.id));

    const result = await this.findByFullBaid(fullBaid);
    return result || null;
  }

  /**
   * Confirm receiving base move (only manager can do this)
   * Changes status to COMPLETED and confirms quantities in relations
   */
  async confirmReceiving(params: {
    fullBaid: string;
    humanAid: string;
  }): Promise<BaseMove | null> {
    // Check if user has manager role
    const hasManagerRole = await this.checkManagerRole(params.humanAid);
    if (!hasManagerRole) {
      throw new Error(
        'Недостаточно прав для подтверждения входящей машины. ' +
        'Эта операция доступна только для менеджеров. ' +
        'Пожалуйста, обратитесь к администратору системы для получения необходимых прав доступа.'
      );
    }

    const baseMove = await this.findByFullBaid(params.fullBaid);
    if (!baseMove) {
      throw new Error('Входящая машина не найдена');
    }

    if (baseMove.statusName !== 'ON_APPROVAL' && baseMove.statusName !== 'IN_PROGRESS') {
      throw new Error('Подтверждение возможно только для машин в статусе ON_APPROVAL или IN_PROGRESS');
    }

    // Recalculate receiving metrics
    await this.recalculateReceivingMetrics(params.fullBaid);

    // Confirm quantities in relations
    const { RelationsRepository } = await import('./relations.repository');
    const relationsRepo = RelationsRepository.getInstance();
    await relationsRepo.confirmBaseMoveQuantities(params.fullBaid);

    // Update base move status to COMPLETED
    await this.db
      .update(schema.baseMoves)
      .set({
        statusName: 'COMPLETED',
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, baseMove.id));

    if (baseMove.fullBaid) {
      await this.recalculateProductsForBaseMove(baseMove.fullBaid);
    }

    const result = await this.findByFullBaid(params.fullBaid);
    return result || null;
  }

  /**
   * Confirm sending base move (only manager can do this)
   * Changes status to COMPLETED and confirms quantities in relations
   */
  async confirmSending(params: {
    fullBaid: string;
    humanAid: string;
  }): Promise<BaseMove | null> {
    // Check if user has manager role
    const hasManagerRole = await this.checkManagerRole(params.humanAid);
    if (!hasManagerRole) {
      throw new Error(
        'Недостаточно прав для подтверждения исходящей машины. ' +
        'Эта операция доступна только для менеджеров. ' +
        'Пожалуйста, обратитесь к администратору системы для получения необходимых прав доступа.'
      );
    }

    const baseMove = await this.findByFullBaid(params.fullBaid);
    if (!baseMove) {
      throw new Error('Исходящая машина не найдена');
    }

    if (baseMove.statusName !== 'ON_APPROVAL' && baseMove.statusName !== 'IN_PROGRESS') {
      throw new Error('Подтверждение возможно только для машин в статусе ON_APPROVAL или IN_PROGRESS');
    }

    // Recalculate sending metrics
    await this.recalculateSendingMetrics(params.fullBaid);

    // Confirm quantities in relations
    const { RelationsRepository } = await import('./relations.repository');
    const relationsRepo = RelationsRepository.getInstance();
    await relationsRepo.confirmBaseMoveQuantities(params.fullBaid);

    // Update base move status to COMPLETED
    await this.db
      .update(schema.baseMoves)
      .set({
        statusName: 'COMPLETED',
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, baseMove.id));

    if (baseMove.fullBaid) {
      await this.recalculateProductsForBaseMove(baseMove.fullBaid);
    }

    const result = await this.findByFullBaid(params.fullBaid);
    return result || null;
  }

  /**
   * Find receiving by sending_baid
   */
  async findReceivingBySendingBaid(sendingFullBaid: string): Promise<BaseMove | null> {
    const allMoves = await this.db
      .select()
      .from(schema.baseMoves)
      .where(notDeleted(schema.baseMoves.deletedAt))
      .execute();

    // Filter by data_in.sending_baid
    for (const move of allMoves) {
      if (!move.dataIn) continue;
      try {
        const data = parseJson<ReceivingDataIn>(move.dataIn, {} as ReceivingDataIn);
        if (data.sending_baid === sendingFullBaid) {
          return move;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Sync sending inventory to related receiving
   * When a product is added/removed/updated in sending, sync it to receiving with location prefix replacement
   */
  async syncSendingToReceiving(sendingFullBaid: string): Promise<void> {
    // Find sending
    const sending = await this.findByFullBaid(sendingFullBaid);
    if (!sending) return;

    // Find related receiving
    const receiving = await this.findReceivingBySendingBaid(sendingFullBaid);
    if (!receiving || !receiving.fullBaid) return;

    // Parse sending data
    const sendingData = parseJson<SendingDataIn>(sending.dataIn, {} as SendingDataIn);
    const sendingInventory = await ensureInventory(this.db, sending.fullBaid as string);

    // Parse receiving data
    const receivingData = parseJson<ReceivingDataIn>(receiving.dataIn, {} as ReceivingDataIn);
    const receivingInventory = await ensureInventory(this.db, receiving.fullBaid as string);

    // Get location names
    const fromLocationName = sendingData.location_laid || sending.laidFrom;
    const toLocationName = receivingData.location_laid || receiving.laidTo;

    if (!fromLocationName || !toLocationName) {
      console.warn('Cannot sync: missing location information');
      return;
    }

    // Get location data_in.name values
    const [fromLocation] = await this.db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.laid, fromLocationName))
      .limit(1);

    const [toLocation] = await this.db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.laid, toLocationName))
      .limit(1);

    if (!fromLocation || !toLocation) {
      console.warn('Cannot sync: locations not found');
      return;
    }

    // Parse location data_in to get name
    let fromName: string | null = null;
    let toName: string | null = null;

    try {
      const fromDataIn = parseJson<{ name?: string }>(fromLocation.dataIn, {});
      fromName = fromDataIn.name || null;
    } catch (e) {
      console.error('Failed to parse fromLocation dataIn:', e);
    }

    try {
      const toDataIn = parseJson<{ name?: string }>(toLocation.dataIn, {});
      toName = toDataIn.name || null;
    } catch (e) {
      console.error('Failed to parse toLocation dataIn:', e);
    }

    if (!fromName || !toName) {
      console.warn('Cannot sync: location names not found in data_in');
      return;
    }

    // Sync each item from sending to receiving
    const updatedReceivingInventory: RelationInventory[] = [];

    for (const sendingItem of sendingInventory) {
      const sendingDataIn = getRelationDataIn(sendingItem);
      if (!sendingDataIn) {
        continue;
      }
      // Get product to check title
      const variantFullPaid = getRelationSourceEntity(sendingItem);
      if (!variantFullPaid) continue;

      const [product] = await this.db
        .select()
        .from(schema.products)
        .where(eq(schema.products.paid, variantFullPaid))
        .limit(1);

      if (!product || !product.title) continue;

      // Check if title starts with fromName prefix
      const fromPrefix = `${fromName}#`;
      if (!product.title.startsWith(fromPrefix)) {
        // Product doesn't have location prefix, skip
        continue;
      }

      // Replace prefix to find target product
      const toPrefix = `${toName}#`;
      const targetTitle = product.title.replace(fromPrefix, toPrefix);

      // Find product with target title
      const [targetProduct] = await this.db
        .select()
        .from(schema.products)
        .where(eq(schema.products.title, targetTitle))
        .limit(1);

      if (!targetProduct) {
        console.warn(`Target product not found: ${targetTitle}`);
        continue;
      }

      // Check if item already exists in receiving inventory
      const existingIndex = receivingInventory.findIndex(
        (item) => getRelationSourceEntity(item) === targetProduct.paid
      );

      if (existingIndex >= 0) {
        // Update existing item
        const targetDataIn = ensureRelationDataIn(receivingInventory[existingIndex]);
        targetDataIn.quantity = sendingDataIn.quantity;
        targetDataIn.temp_quantity = sendingDataIn.temp_quantity;
        updatedReceivingInventory.push(receivingInventory[existingIndex]);
      } else {
        // Add new item to receiving
        const newItem = {
          updatedAt: new Date(),
          createdAt: new Date(),
          deletedAt: null,
          gin: null,
          fts: null,
          source_entity: targetProduct.paid,
          sourceEntity: targetProduct.paid,
          data_in: {
            quantity: sendingDataIn.quantity,
            temp_quantity: sendingDataIn.temp_quantity,
          } as RelationInventoryDataIn,
          statusName: 'INCOME_INV',
        };

        // Copy prices
        if (sendingDataIn.purchase_price !== undefined) {
          newItem.data_in.purchase_price = sendingDataIn.purchase_price;
        }

        receivingInventory.push(newItem as RelationInventory);
        updatedReceivingInventory.push(newItem as RelationInventory);

        // Create relation for new item
        try {
          const { RelationsRepository } = await import('./relations.repository');
          const relationsRepo = RelationsRepository.getInstance();
          await relationsRepo.linkVariantToBaseMove(
            targetProduct.paid!,
            receiving.fullBaid,
            {
              type: 'MOVE_ITEM',
              statusName: 'INCOME_INV',
              tempQuantity: newItem.data_in.temp_quantity,
              dataIn: {
                addedAt: new Date().toISOString(),
                syncedFromSending: sendingFullBaid,
              },
            }
          );
        } catch (error) {
          console.error('Failed to create relation for receiving item:', error);
        }
      }
    }

    // Remove items from receiving that are not in sending anymore
    const sendingVariantIds = new Set(
      sendingInventory
        .map((item) => getRelationSourceEntity(item))
        .filter((value): value is string => Boolean(value))
    );

    const finalReceivingInventory = receivingInventory.filter((item) => {
      const variantFullPaid = getRelationSourceEntity(item);
      if (!variantFullPaid) return false;

      // Check if this is a synced item by checking if it matches any sending item
      // We need to check if the product title would match after prefix replacement
      return true; // Keep all items for now, we can enhance this logic later
    });

    // Update receiving data_in with synced inventory
    receivingData.inventory_list = finalReceivingInventory as unknown as InventoryItem[];

    await this.db
      .update(schema.baseMoves)
      .set({
        dataIn: receivingData,
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, receiving.id));

    // Recalculate receiving metrics
    await this.recalculateReceivingMetrics(receiving.fullBaid);
  }

  /**
   * Update base move status by fullBaid and sync with related move
   */
  async updateBaseMoveStatus(fullBaid: string, statusName: string): Promise<BaseMove | null> {
    const existing = await this.findByFullBaid(fullBaid);
    if (!existing) {
      return null;
    }

    const recalculationTargets = new Set<string>();
    if (existing.fullBaid) {
      recalculationTargets.add(existing.fullBaid);
    }

    const normalizedStatus = statusName.toUpperCase();
    const existingData = parseJson<SendingDataIn | ReceivingDataIn>(existing.dataIn, {});
    const isExistingSending =
      (!!existing.laidFrom && !existing.laidTo) ||
      (existingData && (existingData as SendingDataIn).type === 'SENDING');

    // Update current move status
    await this.db
      .update(schema.baseMoves)
      .set({
        statusName,
        updatedAt: new Date(),
      })
      .where(eq(schema.baseMoves.id, existing.id));

    if (normalizedStatus === 'ON_APPROVAL' && isExistingSending && existing.fullBaid) {
      await this.commitSendingRelations(existing.fullBaid);
    }

    // Sync status with related move
    let relatedReceiving: BaseMove | null = null;
    let relatedSending: BaseMove | null = null;

    // Check if this is a sending with related receiving
    relatedReceiving = await this.findReceivingBySendingBaid(fullBaid);
    if (relatedReceiving) {
      // Update related receiving status
      await this.db
        .update(schema.baseMoves)
        .set({
          statusName,
          updatedAt: new Date(),
        })
        .where(eq(schema.baseMoves.id, relatedReceiving.id));

      if (relatedReceiving.fullBaid) {
        recalculationTargets.add(relatedReceiving.fullBaid);
      }
    } else {
      // Check if this is a receiving with related sending
      const receivingData = existingData as ReceivingDataIn;
      if (receivingData.sending_baid) {
        relatedSending = await this.findByFullBaid(receivingData.sending_baid);
        if (relatedSending) {
          // Update related sending status
          await this.db
            .update(schema.baseMoves)
            .set({
              statusName,
              updatedAt: new Date(),
            })
            .where(eq(schema.baseMoves.id, relatedSending.id));

          if (relatedSending.fullBaid) {
            recalculationTargets.add(relatedSending.fullBaid);
          }

          const relatedSendingData = parseJson<SendingDataIn | ReceivingDataIn>(relatedSending.dataIn, {});
          const isRelatedSending =
            (!!relatedSending.laidFrom && !relatedSending.laidTo) ||
            (relatedSendingData && (relatedSendingData as SendingDataIn).type === 'SENDING');

          if (normalizedStatus === 'ON_APPROVAL' && isRelatedSending && relatedSending.fullBaid) {
            await this.commitSendingRelations(relatedSending.fullBaid);
          }
        }
      }
    }

    for (const targetFullBaid of recalculationTargets) {
      await this.recalculateProductsForBaseMove(targetFullBaid);
    }

    const result = await this.findByFullBaid(fullBaid);
    return result || null;
  }

  private async commitSendingRelations(fullBaid?: string | null): Promise<void> {
    if (!fullBaid) {
      return;
    }

    try {
      const relationsRepo = RelationsRepository.getInstance();
      const relations = await relationsRepo.getRelationsForBaseMove(fullBaid);
      if (!relations.length) {
        return;
      }

      const now = new Date();

      for (const relation of relations) {
        const dataIn = parseJson<Record<string, unknown>>(relation.dataIn, {});
        const hasTempQuantity = dataIn.temp_quantity !== undefined && dataIn.temp_quantity !== null;

        if (hasTempQuantity) {
          const tempQuantity = toNumber(dataIn.temp_quantity);
          dataIn.quantity = tempQuantity;
          dataIn.temp_quantity = tempQuantity;
        }

        await this.db
          .update(schema.relations)
          .set({
            statusName: 'COMMITTED_INV',
            dataIn: dataIn,
            updatedAt: now,
          })
          .where(eq(schema.relations.id, relation.id));
      }
    } catch (error) {
      console.error(`Failed to commit relations for sending ${fullBaid}:`, error);
    }
  }

  /**
   * Recalculate average purchase prices for products linked to the base move
   */
  private async recalculateProductsForBaseMove(fullBaid?: string | null): Promise<void> {
    if (!fullBaid) {
      return;
    }

    const baseMove = await this.findByFullBaid(fullBaid);
    if (!baseMove || baseMove.statusName !== 'COMPLETED') {
      return;
    }

    const relations = await this.db
      .select({ sourceEntity: schema.relations.sourceEntity })
      .from(schema.relations)
      .where(
        withNotDeleted(
          schema.relations.deletedAt,
          and(
            eq(schema.relations.targetEntity, fullBaid),
            eq(schema.relations.type, 'MOVE_ITEM')
          )
        )
      )
      .execute();

    if (!relations.length) {
      return;
    }

    const uniquePaid = new Set<string>();
    relations.forEach(({ sourceEntity }) => {
      if (typeof sourceEntity === 'string' && sourceEntity) {
        uniquePaid.add(sourceEntity);
      }
    });

    if (!uniquePaid.size) {
      return;
    }


    for (const paid of uniquePaid) {
      try {

        const productsRepo = ProductsRepository.getInstance();

        await productsRepo.recalculateAveragePriceByPaid(paid);
      } catch (error) {
        console.error(
          `Failed to recalculate average price for product ${paid} after status change of base move ${fullBaid}:`,
          error
        );
      }
    }
  }

  /**
   * Check if user has manager role
   */
  private async checkManagerRole(humanAid: string): Promise<boolean> {
    // Find user by humanAid
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.humanAid, humanAid))
      .limit(1);

    if (!user) {
      return false;
    }

    // Get user roles
    const userRoleAssociations = await this.db
      .select()
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userUuid, user.uuid))
      .execute();

    if (!userRoleAssociations.length) {
      return false;
    }

    const roleUuids = userRoleAssociations.map((ur) => ur.roleUuid);

    // Fetch roles
    const roles = await this.db
      .select()
      .from(schema.roles)
      .where(notDeleted(schema.roles.deletedAt))
      .execute();

    // Check if any role has name 'manager' or 'admin'
    const hasManagerRole = roles.some(
      (role) =>
        roleUuids.includes(role.uuid) &&
        (role.name === 'manager' || role.name === 'admin')
    );

    return hasManagerRole;
  }

  async sendPushToManager(title: string, body: string, context: { env: Env }, url: string): Promise<void> {
    const humanRepository = HumanRepository.getInstance();
    const humans = await humanRepository.getAllManagers();
    for (const human of humans) {
      try {
        await sendPushNotificationToHuman({
          haid: human.haid,
          title,
          body,
          url,
          context,
        });
      } catch (error) {
        console.error(`Failed to send push notification to manager ${human.haid}:`, error);
      }
    }
  }
}

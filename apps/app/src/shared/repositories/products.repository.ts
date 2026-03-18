import { eq, or, desc, and } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { schema } from "../schema";
import type { BaseMove, Product } from "../schema/types";
import Produts from '../collections/products'
import { createDb, parseJson, stringifyJson, notDeleted, withNotDeleted, type SiteDb } from "./utils";
import type { InventoryItem, ProductExtended, ProductExtendedDataIn, RelationInventory, RelationInventoryDataIn } from "../types/store";
import { ensureInventory } from "./base-moves.repository";
import BaseRepository from "./BaseRepositroy";
import type { DbFilters, DbOrders, DbPagination, DbPaginatedResult } from "../types/shared";

const productsCollection = new Produts();

type InventorySnapshot = {
  available: number;
  incoming: number;
  outgoing: number;
  locations: Record<string, number>;
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

type BaseMoveInventoryPayload = {
  inventory?: InventoryItem[];
  inventory_list?: InventoryItem[];
  type?: string;
};



export class ProductsRepository extends BaseRepository<ProductExtended> {
  private static instance: ProductsRepository | null = null;

  private constructor() {
    super( schema.products);
  }

  public static getInstance(): ProductsRepository {
    if (!ProductsRepository.instance) {
      ProductsRepository.instance = new ProductsRepository();
    }
    return ProductsRepository.instance;
  }

  async findByPaid(paid: string): Promise<Product | ProductExtended | undefined> {
    const [product] = await this.db
      .select()
      .from(schema.products)
      .where(withNotDeleted(
        schema.products.deletedAt,
        eq(schema.products.paid, paid)
      ))
      .limit(1);

    if(!product) return undefined;
    return productsCollection.parse(product) as Product | undefined;
  }

  async getPublicProducts(limit = 20): Promise<Product[]> {
    return this.db
      .select()
      .from(schema.products)
      .where(withNotDeleted(
        schema.products.deletedAt,
        eq(schema.products.isPublic, true)
      ))
      .limit(limit)
      .execute();
  }

  async getInventorySnapshot(
    fullPaid: string,
    options: { locationLaid?: string } = {}
  ): Promise<InventorySnapshot> {
    const { locationLaid } = options;

    const baseCondition = locationLaid
      ? withNotDeleted(
          schema.baseMoves.deletedAt,
          or(
            eq(schema.baseMoves.laidTo, locationLaid),
            eq(schema.baseMoves.laidFrom, locationLaid)
          )
        )
      : notDeleted(schema.baseMoves.deletedAt);

    const moves = await this.db
      .select({
        status: schema.baseMoves.statusName,
        dataIn: schema.baseMoves.dataIn,
        laidFrom: schema.baseMoves.laidFrom,
        laidTo: schema.baseMoves.laidTo,
      })
      .from(schema.baseMoves)
      .where(baseCondition);

    const snapshot: InventorySnapshot = {
      available: 0,
      incoming: 0,
      outgoing: 0,
      locations: {},
    };

    for (const move of moves) {
      const data = parseJson<Record<string, unknown>>(move.dataIn, {});
      const inventory = (data as Record<string, unknown>)?.inventory_list ??
        (data as Record<string, unknown>)?.inventory;

      if (!Array.isArray(inventory)) {
        continue;
      }

      for (const rawItem of inventory) {
        const item = rawItem as Record<string, unknown>;
        const variantFullPaid = (item?.variantFullPaid || item?.productVariantFullPaid || item?.full_paid) as
          | string
          | undefined;

        if (!variantFullPaid) {
          continue;
        }

        const belongsToProduct = variantFullPaid.startsWith(`${fullPaid}-`)
          || variantFullPaid === fullPaid;

        if (!belongsToProduct) {
          continue;
        }

        const quantity = toNumber(item?.quantity ?? item?.hiddenQuantity);
        if (!quantity) {
          continue;
        }

        const locationKey = move.laidTo || move.laidFrom || "unknown";
        snapshot.locations[locationKey] = (snapshot.locations[locationKey] || 0) + quantity;

        if (quantity > 0) {
          snapshot.incoming += quantity;
        } else {
          snapshot.outgoing += Math.abs(quantity);
        }

        snapshot.available += quantity;
      }
    }

    return snapshot;
  }

  async updateProductData(
    paid: string,
    data: Record<string, unknown>
  ): Promise<Product | null> {
    const product = await this.findByPaid(paid) as ProductExtended;
    if (!product) {
      return null;
    }

    const mergedData = {
      ...(product.data_in as Record<string, unknown> || {}),
      ...data,
    };

    await this.db
      .update(schema.products)
      .set({ dataIn: mergedData })
      .where(eq(schema.products.id, product.id));

    return {
      ...product,
      dataIn: mergedData,
    };
  }

  async recalculateAveragePriceByPaid(paid: string): Promise<Product | null> {
    const product = await this.findByPaid(paid);
    if (!product) {
      return null;
    }
    //console.log('product', product);


    const productData = product.dataIn  as ProductExtendedDataIn

    const relations = await this.db
      .select()
      .from(schema.relations)
      .where(
        withNotDeleted(
          schema.relations.deletedAt,
          or(
            eq(schema.relations.type, "MOVE_ITEM"),
            eq(schema.relations.type, "INVENTORY_ITEM")
          )
        )
      )
      .execute();

    type RelationContext = {
      variantFullPaid: string;
      targetEntity: string;
      relationQuantity: number;
    };

    const relationContexts: RelationContext[] = [];

    for (const relation of relations) {
      const relationProductPaid = relation.sourceEntity;
      if (!relationProductPaid) {
        continue;
      }

      if (relationProductPaid !== paid) {
        continue;
      }

      const relationData = parseJson<RelationInventoryDataIn>(relation.dataIn, {} as RelationInventoryDataIn);
      const rawQuantity = toNumber(relationData.quantity ?? relationData.temp_quantity);

      if (rawQuantity < 0) {
        // Отрицательные количества относятся к расходным операциям, не учитываем их в расчете себестоимости
        continue;
      }

      if (!relation.targetEntity) {
        continue;
      }

      relationContexts.push({
        variantFullPaid: relation.sourceEntity,
        targetEntity: relation.targetEntity,
        relationQuantity: rawQuantity,
      });
    }

    if (!relationContexts.length) {
      // Нет данных для перерасчета — возвращаем продукт без изменений
      return product;
    }

    const targetFullBaids = Array.from(
      new Set(
        relationContexts
          .map((context) => context.targetEntity)
          .filter((fullBaid): fullBaid is string => Boolean(fullBaid))
      )
    );

    const baseMoveMap = new Map<string, BaseMove>();

    if (targetFullBaids.length > 0) {
      const conditions = targetFullBaids.map((fullBaid) => eq(schema.baseMoves.fullBaid, fullBaid));
      const whereCondition = conditions.length === 1 ? conditions[0] : or(...conditions);

      const baseMoves = await this.db
        .select()
        .from(schema.baseMoves)
        .where(
          withNotDeleted(
            schema.baseMoves.deletedAt,
            whereCondition
          )
        )
        .execute();

      for (const move of baseMoves) {
        if (move.fullBaid) {
          baseMoveMap.set(move.fullBaid, move);
        }
      }
    }

    const productDataCache = new Map<string, ProductExtendedDataIn>();
    productDataCache.set(paid, productData);

    const getProductData = async (productPaidKey: string): Promise<ProductExtendedDataIn> => {
      if (productDataCache.has(productPaidKey)) {
        return productDataCache.get(productPaidKey)!;
      }

      const productRecord = await this.findByPaid(productPaidKey);
      const parsed = productRecord?.dataIn as ProductExtendedDataIn || {} as ProductExtendedDataIn

      productDataCache.set(productPaidKey, parsed);
      return parsed;
    };

    let totalQuantity = 0;
    let totalAllocatedCost = 0;

    for (const fullBaid of targetFullBaids) {
      const move = baseMoveMap.get(fullBaid);
      if (!move) {
        continue;
      }

      if ((move.statusName || "").toUpperCase() !== "COMPLETED") {
        continue;
      }

      const moveData = parseJson<BaseMoveInventoryPayload>(move.dataIn, {} as BaseMoveInventoryPayload);
      const receivingData = moveData as BaseMoveInventoryPayload & { purchase_price_transport?: number; transportCost?: number };
      const isReceiving = ((move.laidTo && !move.laidFrom) || moveData.type === "RECEIVING");
      if (!isReceiving) {
        continue;
      }

      const inventoryList = await ensureInventory(this.db, fullBaid);
      if (!inventoryList.length) {
        continue;
      }

      const productQuantityForMove = relationContexts
        .filter((item) => item.targetEntity === fullBaid)
        .reduce((sum, item) => sum + Math.abs(item.relationQuantity), 0);

      if (!productQuantityForMove) {
        continue;
      }

      let totalDistributionValue = 0;
      const matchedItems: RelationInventory[] = [];

      for (const item of inventoryList) {
        const itemProductPaid = item.sourceEntity;
        if (!itemProductPaid) {
          continue;
        }

        const itemQuantity = Math.abs(toNumber(item.data_in?.quantity ?? item.data_in?.temp_quantity));
        if (!itemQuantity) {
          continue;
        }

        const itemProductData = await getProductData(itemProductPaid);
        const distributionPrice = toNumber(
          itemProductData.average_purchase_price ??
            itemProductData.price ??
            itemProductData.average_purchase_price_net ??
            0
        );

        if (distributionPrice) {
          totalDistributionValue += distributionPrice * itemQuantity;
        }

        if (itemProductPaid === paid) {
          matchedItems.push(item );
        }
      }

      if (!matchedItems.length) {
        continue;
      }

      const purchaseCost = Math.round(
        toNumber(receivingData.purchase_price_transport ?? receivingData.transportCost ?? 0)
      );

      const productDistributionData = await getProductData(paid);
      const productDistributionPrice = toNumber(
        productDistributionData.average_purchase_price ??
          productDistributionData.price ??
          productDistributionData.average_purchase_price_net ??
          0
      );

      const productWeightedVolume = productDistributionPrice * productQuantityForMove;
      const totalMoveQuantity = inventoryList.reduce((sum, item) => {
        const qty = Math.abs(toNumber(item.data_in?.quantity ?? item.data_in?.temp_quantity));
        return sum + qty;
      }, 0);

      const shareByPrice = totalDistributionValue > 0
        ? productWeightedVolume / totalDistributionValue
        : 0;

      const shareByQuantity = totalMoveQuantity > 0
        ? productQuantityForMove / totalMoveQuantity
        : 0;

      const allocatedCost = Math.round(
        (shareByPrice || shareByQuantity) * purchaseCost
      );

      totalQuantity += productQuantityForMove;
      totalAllocatedCost += allocatedCost;
    }

    let averageNet = 0;
    let averageWithMarkup = 0;

    if (totalQuantity > 0) {
      averageNet = Math.round(totalAllocatedCost / totalQuantity);
      const markupAmount = toNumber(productData.markup_amount);
      const markupMeasurement = productData.markup_measurement;

      switch (markupMeasurement) {
        case "%":
          averageWithMarkup = Math.round(averageNet * (1 + markupAmount / 100));
          break;
        case "FIX":
          averageWithMarkup = Math.round(averageNet + markupAmount * 100);
          break;
        default:
          averageWithMarkup = averageNet;
          break;
      }
    } else {
      averageNet = toNumber(productData.average_purchase_price_net ?? productData.price ?? 0);
      averageWithMarkup = toNumber(
        productData.average_purchase_price ??
          productData.average_purchase_price_net ??
          productData.price ??
          0
      );
    }

    if (!averageNet) {
      averageNet = toNumber(productData.average_purchase_price_net ?? productData.price ?? 0);
    }

    if (!averageWithMarkup) {
      averageWithMarkup = averageNet;
    }

    const updatedData: ProductExtendedDataIn = {
      ...productData,
      average_purchase_price_net: averageNet,
      average_purchase_price: averageWithMarkup,
    };

    const updatedAt = new Date();

    await this.db
      .update(schema.products)
      .set({
        dataIn: updatedData,
        updatedAt,
      })
      .where(eq(schema.products.id, product.id));

    return (await this.findByPaid(paid)) ?? null;
  }

  async findPaginated(options: {
    page?: number;
    limit?: number;
  }): Promise<{
    docs: Product[];
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
      .select({ count: schema.products.id })
      .from(schema.products)
      .where(notDeleted(schema.products.deletedAt))
      .execute();
    
    const totalDocs = countResult.length;

    // Get paginated data (excluding soft-deleted)
    const docs = await this.db
      .select()
      .from(schema.products)
      .where(notDeleted(schema.products.deletedAt))
      .orderBy(desc(schema.products.id))
      .limit(limit)
      .offset(offset)
      .execute();

    const totalPages = Math.ceil(totalDocs / limit);

    return {
      docs: productsCollection.parse(docs) as Product[],
      totalDocs,
      totalPages,
      page,
      limit,
    };
  }

  async findPaginatedByLocation(options: {
    page?: number;
    limit?: number;
    locationLaid: string;
  }): Promise<{
    docs: Product[];
    totalDocs: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.max(options.limit || 20, 1);
    const offset = (page - 1) * limit;

    // Get all products (excluding soft-deleted)
    const allProducts = await this.db
      .select()
      .from(schema.products)
      .where(notDeleted(schema.products.deletedAt))
      .orderBy(desc(schema.products.id))
      .execute();

    // Filter products by data_in.warehouse_laid matching the location
    const filteredProducts = allProducts.filter(p => {
      if (!p.dataIn) return false;
      
      const dataIn = parseJson<Record<string, unknown>>(p.dataIn, {});
      const warehouseLaid = dataIn?.warehouse_laid as string | undefined;
      
      // Match if warehouse_laid equals the location
      return warehouseLaid === options.locationLaid;
    });

    const totalDocs = filteredProducts.length;
    const totalPages = Math.ceil(totalDocs / limit);

    // Apply pagination
    const docs = filteredProducts.slice(offset, offset + limit);

    return {
      docs,
      totalDocs,
      totalPages,
      page,
      limit,
    };
  }

  async findPaginatedWithFilters(options: {
    page?: number;
    limit?: number;
    category?: string;
    statusName?: string;
    warehouseLaid?: string;
    search?: string;
  }): Promise<{
    docs: Product[];
    totalDocs: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.max(options.limit || 20, 1);
    const offset = (page - 1) * limit;

    // Get all products (excluding soft-deleted)
    const allProducts = await this.db
      .select()
      .from(schema.products)
      .where(notDeleted(schema.products.deletedAt))
      .orderBy(desc(schema.products.id))
      .execute();

    // Apply filters
    const filteredProducts = allProducts.filter(p => {
      // Filter by category
      if (options.category && p.category !== options.category) {
        return false;
      }

      // Filter by statusName
      if (options.statusName && p.statusName !== options.statusName) {
        return false;
      }

      // Filter by warehouse_laid in data_in
      if (options.warehouseLaid) {
        const dataIn = parseJson<Record<string, unknown>>(p.dataIn || '', {});
        const warehouseLaid = dataIn?.warehouse_laid as string | undefined;
        if (warehouseLaid !== options.warehouseLaid) {
          return false;
        }
      }

      // Filter by search (search in title)
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        const title = (p.title || '').toLowerCase();
        const dataIn = parseJson<Record<string, unknown>>(p.dataIn || '', {});
        const sku = ((dataIn?.sku as string) || '').toLowerCase();
        
        if (!title.includes(searchLower) && !sku.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });

    const totalDocs = filteredProducts.length;
    const totalPages = Math.ceil(totalDocs / limit);

    // Apply pagination
    const docs = filteredProducts.slice(offset, offset + limit);

    return {
      docs: productsCollection.parse(docs) as Product[],
      totalDocs,
      totalPages,
      page,
      limit,
    };
  }

  async getFiltered(filters: DbFilters, orders: DbOrders, pagination: DbPagination): Promise<DbPaginatedResult<ProductExtended>> {
    // Add deletedAt filter automatically
    const conditionsWithDeleted = [
      {
        field: 'deletedAt',
        operator: 'isNull' as const,
        values: [] as never[],
      },
      ...(filters.conditions || []),
    ];

    const filtersWithDeleted = {
      conditions: conditionsWithDeleted,
    };

    return super.getFiltered(filtersWithDeleted, orders, pagination);
  }

  async update(uuid: string, data: Partial<ProductExtended>): Promise<ProductExtended> {
    try {
      const product = await super.update(uuid, data);
      return product;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async softDelete(paid: string): Promise<boolean> {
    try {
      const now = new Date();
      await this.db
        .update(schema.products)
        .set({ 
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.products.paid, paid))
        .execute();
      
      return true;
    } catch (error) {
      console.error('Error soft deleting product:', error);
      return false;
    }
  }
}

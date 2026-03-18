import { eq } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { dealProducts, schema } from "../schema";
import type { DealProduct } from "../schema/types";
import { createDb, parseJson, notDeleted, withNotDeleted, type SiteDb } from "./utils";
import BaseRepository from "./BaseRepositroy";

type FormattedDealProduct = DealProduct & {
  priceFormatted: string;
  metrics: {
    sellingPriceFact?: string;
    sellingPricePlan?: string;
    purchasePriceFact?: string;
    purchasePricePlan?: string;
    sellingPriceFactPerItem?: string;
    sellingPriceFactPerItemValue?: number;
  };
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

function formatNumber(value: number, lang = "en", options: Intl.NumberFormatOptions = {}): string {
  try {
    return new Intl.NumberFormat(lang, options).format(value);
  } catch (error) {
    console.error("Failed to format number", error);
    return value.toString();
  }
}

export class DealProductsRepository extends BaseRepository<DealProduct>{
  private static instance: DealProductsRepository | null = null;

  private constructor() {
    super(schema.dealProducts)

  }

  public static getInstance(
  ): DealProductsRepository {
    if (!DealProductsRepository.instance) {
      DealProductsRepository.instance = new DealProductsRepository();
    }
    return DealProductsRepository.instance;
  }


  async formatForDisplay(
    product: DealProduct,
    options: { lang?: string; currency?: string } = {}
  ): Promise<FormattedDealProduct> {
    const { lang = "en", currency = "USD" } = options;
    const data = product.dataIn as Record<string, unknown> | null;

    const sellingPlan = toNumber(data?.selling_price_plan ?? data?.price);
    const sellingFact = toNumber(data?.selling_price_fact ?? sellingPlan);
    const purchasePlan = toNumber(data?.purchase_price_plan ?? data?.purchase_price);
    const purchaseFact = toNumber(data?.purchase_price_fact ?? purchasePlan);
    const quantity = toNumber(product.quantity) || 1;

    const sellingPerItem = quantity ? sellingFact / quantity : 0;

    const priceFormatted = formatNumber(sellingFact, lang, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const metrics = {
      sellingPriceFact: formatNumber(sellingFact, lang, {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      sellingPricePlan: formatNumber(sellingPlan, lang, {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      purchasePriceFact: formatNumber(purchaseFact, lang, {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      purchasePricePlan: formatNumber(purchasePlan, lang, {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      sellingPriceFactPerItem: formatNumber(sellingPerItem, lang, {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      sellingPriceFactPerItemValue: sellingPerItem,
    };

    return {
      ...product,
      priceFormatted,
      metrics,
    };
  }
}


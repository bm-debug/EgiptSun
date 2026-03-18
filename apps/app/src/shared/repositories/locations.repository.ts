import { eq, or } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { schema } from "../schema";
import type { Location } from "../schema/types";
import { createDb, parseJson, notDeleted, withNotDeleted, type SiteDb } from "./utils";
import BaseRepository from "./BaseRepositroy";

type LocationInventory = {
  location: Location;
  totalItems: number;
  variants: Record<string, number>;
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

export class LocationsRepository extends BaseRepository<Location>{
  private static instance: LocationsRepository | null = null;

  private constructor() {
    super(schema.locations)

  }

  public static getInstance(
  ): LocationsRepository {
    if (!LocationsRepository.instance) {
      LocationsRepository.instance = new LocationsRepository();
    }
    return LocationsRepository.instance;
  }

  async findByLaid(laid: string): Promise<Location | undefined> {
    const [location] = await this.db
      .select()
      .from(schema.locations)
      .where(withNotDeleted(
        schema.locations.deletedAt,
        eq(schema.locations.laid, laid)
      ))
      .limit(1);

    return location;
  }

  async getPublicLocations(limit = 50): Promise<Location[]> {
    return this.db
      .select()
      .from(schema.locations)
      .where(withNotDeleted(
        schema.locations.deletedAt,
        eq(schema.locations.isPublic, true)
      ))
      .limit(limit)
      .execute();
  }

  async getInventory(laid: string): Promise<LocationInventory | null> {
    const location = await this.findByLaid(laid);
    if (!location) {
      return null;
    }

    const moves = await this.db
      .select({
        dataIn: schema.baseMoves.dataIn,
        laidFrom: schema.baseMoves.laidFrom,
        laidTo: schema.baseMoves.laidTo,
      })
      .from(schema.baseMoves)
      .where(
        withNotDeleted(
          schema.baseMoves.deletedAt,
          or(
            eq(schema.baseMoves.laidTo, laid),
            eq(schema.baseMoves.laidFrom, laid)
          )
        )
      );

    const variants: Record<string, number> = {};
    let totalItems = 0;

    for (const move of moves) {
      const data = parseJson<Record<string, unknown>>(move.dataIn, {});
      const inventory = (data as Record<string, unknown>)?.inventory_list ??
        (data as Record<string, unknown>)?.inventory;

      if (!Array.isArray(inventory)) {
        continue;
      }

      for (const rawItem of inventory) {
        const item = rawItem as Record<string, unknown>;
        const quantity = toNumber(item?.quantity ?? item?.hiddenQuantity);
        if (!quantity) {
          continue;
        }

        const variantKey = (item?.variantFullPaid || item?.productVariantFullPaid || item?.full_paid) as
          | string
          | undefined;
        if (!variantKey) {
          continue;
        }

        const sign = move.laidTo === laid ? 1 : -1;
        variants[variantKey] = (variants[variantKey] || 0) + quantity * sign;
        totalItems += quantity * sign;
      }
    }

    return {
      location,
      variants,
      totalItems,
    };
  }
}

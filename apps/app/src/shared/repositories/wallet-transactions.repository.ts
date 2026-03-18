import { and, desc, eq } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { schema, walletTransactions } from "../schema";
import type { WalletTransaction } from "../schema/types";
import { createDb, parseJson, notDeleted, withNotDeleted, type SiteDb } from "./utils";
import { generateAid } from "../generate-aid";
import BaseRepository from "./BaseRepositroy";

type FormattedTransaction = Omit<WalletTransaction, "amount"> & {
  amount: number;
  amountFormatted: string;
  createdAtFormatted: string;
  statusTitle: string;
};

function formatNumber(value: number, lang = "en", options: Intl.NumberFormatOptions = {}): string {
  try {
    return new Intl.NumberFormat(lang, options).format(value);
  } catch (error) {
    console.error("Failed to format number", error);
    return value.toString();
  }
}

export class WalletTransactionsRepository extends BaseRepository<WalletTransaction>{
  private static instance: WalletTransactionsRepository | null = null;

  private constructor() {
    super(schema.walletTransactions)
  }

  public static getInstance(
  ): WalletTransactionsRepository {
    if (!WalletTransactionsRepository.instance) {
      WalletTransactionsRepository.instance = new WalletTransactionsRepository();
    }
    return WalletTransactionsRepository.instance;
  }


  async parseForDisplay(
    transaction: WalletTransaction,
    options: { lang?: string; currency?: string } = {}
  ): Promise<FormattedTransaction> {
    const { lang = "en", currency = "USD" } = options;
    const data = parseJson<Record<string, unknown>>(transaction.dataIn, {});
    const amountCents = Number(transaction.amount ?? 0);
    const amount = amountCents / 100;

    const amountFormatted = formatNumber(amount, lang, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const createdAt = transaction.createdAt ? new Date(transaction.createdAt) : null;
    const createdAtFormatted = createdAt && !Number.isNaN(createdAt.getTime())
      ? new Intl.DateTimeFormat(lang, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(createdAt)
      : "";

    const statusTitle = (data?.status_title as string) || transaction.statusName || "";

    return {
      ...transaction,
      amount,
      amountFormatted,
      createdAtFormatted,
      statusTitle,
    };
  }

  async createTransaction(payload: typeof schema.walletTransactions.$inferInsert): Promise<WalletTransaction> {
    if (!payload.amount) {
      throw new Error("Amount is required");
    }
    if (!payload.fullWaid) {
      throw new Error("Full Waid is required");
    }
    payload.statusName = payload.statusName ?? "PENDING_PAYMENT";
    payload.wcaid = generateAid("wt");
    
    const [transaction] = await this.db.insert(schema.walletTransactions).values(payload).returning();
    return transaction as WalletTransaction;
  }
  async createOppositeTransaction(transaction: WalletTransaction): Promise<WalletTransaction> {
    const amountCents = Number(transaction.amount ?? 0);
    // Removing id and other system fields from transaction spread
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = transaction;
    
    const payload = {
      ...rest,
      amount: String(-amountCents),
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies typeof schema.walletTransactions.$inferInsert;
    
    return this.createTransaction(payload);
  }

  async findByFullWaid(fullWaid: string, options: { limit?: number } = {}): Promise<WalletTransaction[]> {
    const limit = Math.max(options.limit ?? 50, 1);

    return this.db
      .select()
      .from(schema.walletTransactions)
      .where(withNotDeleted(
        schema.walletTransactions.deletedAt,
        eq(schema.walletTransactions.fullWaid, fullWaid)
      ))
      .orderBy(desc(schema.walletTransactions.createdAt))
      .limit(limit)
      .execute();
  }
  async findByParams(params: { fullWaid?: string; wcaid?: string; targetAid?: string }): Promise<WalletTransaction[]> {
    const conditions = [] as Array<ReturnType<typeof eq>>;

    if (params.fullWaid) {
      conditions.push(eq(schema.walletTransactions.fullWaid, params.fullWaid));
    }
    if (params.wcaid) {
      conditions.push(eq(schema.walletTransactions.wcaid, params.wcaid));
    }
    if (params.targetAid) {
      conditions.push(eq(schema.walletTransactions.targetAid, params.targetAid));
    }

    const query = this.db.select().from(schema.walletTransactions);

    const conditionedQuery = conditions.length > 0
      ? query.where(and(...conditions))
      : query;

    return conditionedQuery.execute();
  }
}

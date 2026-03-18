import { and, eq, sql, desc } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { schema } from "../schema";
import type { Wallet, WalletTransaction, NewWallet } from "../schema/types";
import { createDb, parseJson, stringifyJson, notDeleted, withNotDeleted, type SiteDb } from "./utils";
import { ContractorExtended, Sending, WalletExtended } from "../types/store";
import { generateAid } from "../generate-aid";
import { WalletTransactionsRepository } from "./wallet-transactions.repository";
import BaseRepository from "./BaseRepositroy";

type WalletSummary = {
  wallet: Wallet;
  balance: number;
  currencies: Record<string, number>;
};

type TransactionOptions = {
  amount: number;
  currency?: string;
  data?: Record<string, unknown>;
  targetAid?: string | null;
  statusName?: string;
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

export class WalletsRepository extends BaseRepository<Wallet> {
  private static instance: WalletsRepository | null = null;

  private constructor() {
    super(schema.wallets);
  }

  public static getInstance(): WalletsRepository {
    if (!WalletsRepository.instance) {
      WalletsRepository.instance = new WalletsRepository();
    }
    return WalletsRepository.instance;
  }

  async findByFullWaid(fullWaid: string): Promise<Wallet | undefined> {
    const [wallet] = await this.db
      .select()
      .from(schema.wallets)
      .where(withNotDeleted(
        schema.wallets.deletedAt,
        eq(schema.wallets.waid, fullWaid)
      ))
      .limit(1);

    return wallet;
  }

  async findPaginated(options: {
    page?: number;
    limit?: number;
  }): Promise<{
    docs: Wallet[];
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
      .select({ count: schema.wallets.id })
      .from(schema.wallets)
      .where(withNotDeleted(schema.wallets.deletedAt, eq(schema.wallets.statusName, "ACTIVE")))
      .execute();

    const totalDocs = countResult.length;

    // Get paginated data (excluding soft-deleted)
    const docs = await this.db
      .select()
      .from(schema.wallets)
      .where(withNotDeleted(schema.wallets.deletedAt, eq(schema.wallets.statusName, "ACTIVE")))
      .orderBy(desc(schema.wallets.id))
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

  async moveToWallet(fullWaid: string, options: TransactionOptions): Promise<WalletTransaction> {
    return this.createTransaction(fullWaid, {
      ...options,
      amount: Math.abs(options.amount),
      statusName: options.statusName ?? "COMPLETED_PAYMENT",
    });
  }

  async moveFromWallet(fullWaid: string, options: TransactionOptions): Promise<WalletTransaction> {
    return this.createTransaction(fullWaid, {
      ...options,
      amount: -Math.abs(options.amount),
      statusName: options.statusName ?? "COMPLETED_PAYMENT",
    });
  }

  async createTransaction(
    fullWaid: string,
    options: TransactionOptions
  ): Promise<WalletTransaction> {
    const wallet = await this.findByFullWaid(fullWaid);
    if (!wallet) {
      throw new Error(`Wallet ${fullWaid} not found`);
    }

    const payload = {
      uuid: crypto.randomUUID(),
      wcaid: generateAid("wt"),
      fullWaid,
      targetAid: options.targetAid ?? wallet.targetAid,
      amount: String(Math.round(options.amount * 100)),
      statusName: options.statusName ?? "COMPLETED_PAYMENT",
      dataIn: {
        ...(options.data ?? {}),
        currency: options.currency ?? "USD",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Partial<WalletTransaction>;

    const [created] = await this.db
      .insert(schema.walletTransactions)
      .values(payload)
      .returning();

    return created;
  }

  async getBalance(fullWaid: string): Promise<number> {
    const [result] = await this.db
      .select({
        balance: sql<number>`COALESCE(SUM(${schema.walletTransactions.amount}), 0)`,
      })
      .from(schema.walletTransactions)
      .where(
        withNotDeleted(
          schema.walletTransactions.deletedAt,
          and(
            eq(schema.walletTransactions.fullWaid, fullWaid),
            eq(schema.walletTransactions.statusName, "COMPLETED_PAYMENT")
          )
        )
      );

    return toNumber(result?.balance) / 100;
  }

  async getSummary(fullWaid: string): Promise<WalletSummary | null> {
    const wallet = await this.findByFullWaid(fullWaid);
    if (!wallet) {
      return null;
    }

    const transactions = await this.db
      .select()
      .from(schema.walletTransactions)
      .where(withNotDeleted(
        schema.walletTransactions.deletedAt,
        eq(schema.walletTransactions.fullWaid, fullWaid)
      ));

    const currencies: Record<string, number> = {};

    for (const transaction of transactions) {
      const data = parseJson<Record<string, unknown>>(transaction.dataIn, {});
      const currency = (data?.currency as string) || "USD";
      currencies[currency] = (currencies[currency] || 0) + toNumber(transaction.amount) / 100;
    }

    const balance = Object.values(currencies).reduce((acc, curr) => acc + curr, 0);

    return {
      wallet,
      balance,
      currencies,
    };
  }
  async findByTargetAid(targetAid: string): Promise<WalletExtended | undefined> {
    const [wallet] = await this.db
      .select()
      .from(schema.wallets)
      .where(withNotDeleted(
        schema.wallets.deletedAt,
        eq(schema.wallets.targetAid, targetAid)
      ))
      .limit(1);

    return wallet as WalletExtended | undefined;
  }

  async createWallet(targetAid: string, title: string | null): Promise<WalletExtended> {
    const payload = {
      uuid: crypto.randomUUID(),
      waid: generateAid("w"),
      targetAid: targetAid,
      title,
      dataIn: {
        type: 'contractor_wallet',
      },
      statusName: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as typeof schema.wallets.$inferInsert;

    const [wallet] = await this.db
      .insert(schema.wallets)
      .values(payload)
      .returning();

    return wallet as WalletExtended;
  }

  async createDepositByWaid(waid: string, amount: number): Promise<WalletTransaction> {
    const wallet = await this.findByFullWaid(waid);

    if (!wallet) {
      throw new Error(`Wallet with waid '${waid}' not found`);
    }

    return this.moveToWallet(waid, {
      amount,
      targetAid: wallet.targetAid ?? undefined,
      statusName: "COMPLETED_PAYMENT",
    });
  }

  async createDepositByTargetAid(targetAid: string, amount: number): Promise<WalletTransaction> {
    const wallet = await this.findByTargetAid(targetAid);

    if (!wallet) {
      throw new Error(`Wallet with targetAid '${targetAid}' not found`);
    }

    if (!wallet.waid) {
      throw new Error(`Wallet '${targetAid}' does not have waid value`);
    }

    return this.createDepositByWaid(wallet.waid, amount);
  }

  async generateWalletsForContractors(contractors: ContractorExtended[]): Promise<WalletExtended[]> {
    const wallets: WalletExtended[] = [];

    for (const contractor of contractors) {
      const targetAid = contractor.caid;
      if (!targetAid) {
        continue;
      }

      let wallet = await this.findByTargetAid(targetAid);
      if (!wallet) {
        wallet = await this.createWallet(targetAid, contractor.title ?? targetAid,);
      }

      wallets.push(wallet);
    }

    return wallets;
  }
  async genreateTransactionForSending(sending: Sending): Promise<WalletTransaction | null> {

    if (!sending.dataIn?.contractor_caid) {
      console.error("Sending does not have contractor_caid");
      return null;
    }


    const wallet = await this.findByTargetAid(sending.dataIn?.contractor_caid);

    if (!wallet) {
      console.error("wallet not found");
      return null;
    }
    if(!wallet.waid) {
      console.error("wallet does not have waid");
      return null;
    }
    const walletTransactionRepo = WalletTransactionsRepository.getInstance();

    let [walletTransaction] = await walletTransactionRepo.findByParams({
      fullWaid: wallet.waid,
      targetAid: wallet.target_aid,
    });

    if(walletTransaction) {
      return walletTransaction;
    }

    walletTransaction = await walletTransactionRepo.createTransaction({
      amount: (-(sending.dataIn?.total_selling_price || 0)).toString(),
      wcaid: generateAid("wt"),
      fullWaid: wallet.waid,
      targetAid: wallet.targetAid,
      statusName: "COMPLETED_PAYMENT",
      dataIn: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return walletTransaction;
    
  }
}

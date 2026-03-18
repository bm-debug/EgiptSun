/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { WalletsRepository } from '@/shared/repositories/wallets.repository'
import { WalletTransactionsRepository } from '@/shared/repositories/wallet-transactions.repository'
import { createDb, SiteDbPostgres } from '@/shared/repositories/utils';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseTitle(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith("{")) {
    return parseJson(value, value);
  }

  return value;
}

/**
 * GET /api/store/v2/m/wallets/view
 * Returns wallet details and transactions
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const waid = url.searchParams.get("waid")?.trim();
    const limit = Math.max(Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200), 1);

    if (!waid) {
      return new Response(JSON.stringify({ error: "Parameter 'waid' is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const walletsRepository = WalletsRepository.getInstance();
    const transactionsRepository = WalletTransactionsRepository.getInstance();

    const summary = await walletsRepository.getSummary(waid);

    if (!summary) {
      return new Response(JSON.stringify({ error: "Wallet not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { wallet, balance, currencies } = summary;

    const transactionsRaw = await transactionsRepository.findByFullWaid(waid, { limit });

    const transactions = await Promise.all(
      transactionsRaw.map(async (transaction) => {
        const formatted = await transactionsRepository.parseForDisplay(transaction, {
          lang: "ru-RU",
          currency: "RUB",
        });

        return {
          id: formatted.id,
          uuid: formatted.uuid,
          wcaid: formatted.wcaid,
          fullWaid: formatted.fullWaid,
          targetAid: formatted.targetAid,
          amount: formatted.amount,
          amountFormatted: formatted.amountFormatted,
          statusName: formatted.statusName,
          createdAt: formatted.createdAt,
          createdAtFormatted: formatted.createdAtFormatted,
          dataIn: formatted.dataIn as Record<string, unknown> | null,
        };
      })
    );

    const dataIn = wallet.dataIn as Record<string, unknown> | null;

    return new Response(
      JSON.stringify({
        wallet: {
          id: wallet.id,
          uuid: wallet.uuid,
          title: parseTitle(wallet.title),
          waid: wallet.waid,
          targetAid: wallet.targetAid,
          statusName: wallet.statusName,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
          dataIn,
          balance: Number(balance.toFixed(2)),
          currencies,
        },
        transactions,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Get wallet view error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch wallet", details: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export const GET = withManagerGuard(handleGet)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}


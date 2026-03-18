/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { WalletsRepository } from '@/shared/repositories/wallets.repository'

type CreateTransactionPayload = {
  waid?: string;
  targetAid?: string;
  amount?: number | string;
};

function parseAmount(value: number | string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (!Number.isFinite(numeric) || numeric === 0) {
    return null;
  }

  return Math.abs(numeric);
}

/**
 * POST /api/store/v2/m/wallet-transactions
 * Creates a new wallet transaction (deposit)
 */
async function handlePost(context: AuthenticatedRequestContext) {
  const { request, env } = context
  const repository = WalletsRepository.getInstance();

  const body = (await request.json().catch(() => ({}))) as CreateTransactionPayload;
  const waid = typeof body.waid === "string" ? body.waid.trim() : "";
  const targetAid = typeof body.targetAid === "string" ? body.targetAid.trim() : "";
  const amount = parseAmount(body.amount);

  if (!waid && !targetAid) {
    return new Response(JSON.stringify({ error: "Не указан идентификатор кошелька" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (amount === null) {
    return new Response(JSON.stringify({ error: "Введите корректную сумму, отличную от нуля" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const transaction = waid
      ? await repository.createDepositByWaid(waid, amount)
      : await repository.createDepositByTargetAid(targetAid, amount);

    return new Response(
      JSON.stringify({ transaction }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать транзакцию";

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: /not found/i.test(message) ? 404 : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export const POST = withManagerGuard(handlePost)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}


/// <reference types="@cloudflare/workers-types" />

import { DealsRepository } from "@/shared/repositories/deals.repository"
import { InvestorsFormData } from "@/shared/types/altrp"
import type { Env } from '@/shared/types'
import { buildRequestEnv } from '@/shared/env'

const corsHeaders = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json",
}

type RequestContext = {
    request: Request
    env: Env
}

const parseRequestBody = async (request: Request): Promise<InvestorsFormData> => {
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
        const body = (await request.json()) as Record<string, unknown>

        return {
            name: String(body.name ?? "").trim(),
            phone: String(body.phone ?? "").trim(),
            email: String(body.email ?? "").trim(),
        }
    }

    if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
    ) {
        const formData = await request.formData()

        return {
            name: String(formData.get("name") ?? "").trim(),
            phone: String(formData.get("phone") ?? "").trim(),
            email: String(formData.get("email") ?? "").trim(),
        }
    }

    throw new Error("UNSUPPORTED_CONTENT_TYPE")
}

export const onRequestPost = async ({ request, env }: RequestContext) => {
    try {
        const formData = await parseRequestBody(request)

        if (!formData.name || !formData.phone || !formData.email) {
            return new Response(
                JSON.stringify({ ok: false, error: "VALIDATION_ERROR", message: "Missing required fields" }),
                {
                    status: 400,
                    headers: corsHeaders,
                }
            )
        }

        const dealsRepository = new DealsRepository()
        await dealsRepository.createInvestorsFormDeal(formData)

        return new Response(JSON.stringify({ ok: true }), {
            status: 201,
            headers: corsHeaders,
        })
    } catch (error) {
        if (error instanceof Error && error.message === "UNSUPPORTED_CONTENT_TYPE") {
            return new Response(
                JSON.stringify({ ok: false, error: "UNSUPPORTED_CONTENT_TYPE", message: "Unsupported content type" }),
                {
                    status: 415,
                    headers: corsHeaders,
                }
            )
        }

        console.error("Investor form submission error:", error)

        return new Response(
            JSON.stringify({ ok: false, error: "INTERNAL_SERVER_ERROR", message: "Unable to process request" }),
            {
                status: 500,
                headers: corsHeaders,
            }
        )
    }
}

export const onRequestOptions = async () =>
    new Response(null, {
        status: 204,
        headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
        },
    })

export async function POST(request: Request) {
    const env = buildRequestEnv()
    return onRequestPost({ request, env })
}

export async function OPTIONS() {
    return onRequestOptions()
}

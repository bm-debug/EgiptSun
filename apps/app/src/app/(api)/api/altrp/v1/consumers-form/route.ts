/// <reference types="@cloudflare/workers-types" />

import { DealsRepository } from "@/shared/repositories/deals.repository"
import { LoanApplicationDataIn } from "@/shared/types/altrp"
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

class BadRequestError extends Error {
    constructor(message: string, public status: number = 400) {
        super(message)
        this.name = 'BadRequestError'
    }
}

const parseRequestBody = async (request: Request): Promise<LoanApplicationDataIn> => {
    const contentType = request.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
        throw new BadRequestError("Unsupported content type", 415)
    }

    let payload: Partial<LoanApplicationDataIn>
    try {
        payload = await request.json()
    } catch {
        throw new BadRequestError("Unable to parse request body")
    }

    const firstName = (payload.firstName ?? "").toString().trim()
    const lastName = (payload.lastName ?? "").toString().trim()
    const phone = (payload.phone ?? "").toString().trim()
    const email = (payload.email ?? "").toString().trim()
    const productPrice = (payload.productPrice ?? "").toString().trim()

    const termValues = Array.isArray(payload.term)
        ? payload.term.map((value) => Number(value)).filter((value) => Number.isFinite(value))
        : typeof payload.term === "number"
            ? [Number(payload.term)]
            : []

    const missingFields: string[] = []
    if (!firstName) missingFields.push("firstName")
    if (!lastName) missingFields.push("lastName")
    if (!phone) missingFields.push("phone")
    if (!email) missingFields.push("email")
    if (!productPrice) missingFields.push("productPrice")
    if (!termValues.length) missingFields.push("term")

    if (missingFields.length) {
        throw new BadRequestError(`Missing required fields: ${missingFields.join(", ")}`)
    }

    // Validate Cyrillic characters for firstName and lastName
    const cyrillicRegex = /^[А-Яа-яЁё\s-]+$/
    if (firstName && !cyrillicRegex.test(firstName)) {
        throw new BadRequestError("Имя должно содержать только кириллические символы")
    }
    if (lastName && !cyrillicRegex.test(lastName)) {
        throw new BadRequestError("Фамилия должна содержать только кириллические символы")
    }

    return {
        type: "LOAN_APPLICATION",
        firstName,
        lastName,
        phone,
        email: email.toLowerCase(),
        productPrice,
        term: termValues,
    }
}

export const onRequestPost = async ({ request, env }: RequestContext) => {
    try {
        const data = await parseRequestBody(request)
        const dealsRepository = new DealsRepository()
        await dealsRepository.createLoanApplicationDealPublic(data)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Заявка на кредит успешно создана',
            }),
            { status: 201, headers: corsHeaders },
        )
    } catch (error) {
        const status =
            error instanceof BadRequestError
                ? error.status
                : error instanceof Error && error.message.includes("LoanApplicationDataIn is missing required fields")
                    ? 400
                    : 500

        const message =
            error instanceof Error ? error.message : "Unexpected error"

        console.error("Failed to submit loan application", error)

        return new Response(
            JSON.stringify({
                success: false,
                error: status === 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST",
                message,
            }),
            { status, headers: corsHeaders },
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

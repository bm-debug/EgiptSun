/// <reference types="@cloudflare/workers-types" />

import { DealsRepository } from "@/shared/repositories/deals.repository"
import { MessageThreadsRepository } from "@/shared/repositories/message-threads.repository"
import { UsersRepository } from "@/shared/repositories/users.repository"
import {
    LoanApplication,
    LoanApplicationDataIn,
} from "@/shared/types/altrp"
import { BadRequestError, loanDecisionCorsHeaders } from "../decision-handler"
import type { Env } from '@/shared/types'
import { withAdminGuard } from '@/shared/api-guard'
import { buildRequestEnv } from '@/shared/env'

type RequestContext = {
    request: Request
    env: Env
}

type AdditionalInfoRequestPayload = {
    uuid: string
    comment: string
    managerUuid: string
}

const jsonHeaders = {
    ...loanDecisionCorsHeaders,
    "content-type": "application/json",
} as const

const parseAdditionalInfoRequestPayload = async (
    request: Request,
): Promise<AdditionalInfoRequestPayload> => {
    let rawBody: unknown

    try {
        rawBody = await request.json()
    } catch {
        throw new BadRequestError("Неверное тело JSON")
    }

    const body = rawBody as Partial<AdditionalInfoRequestPayload>
    const uuid = typeof body.uuid === "string" ? body.uuid.trim() : ""
    const comment = typeof body.comment === "string" ? body.comment.trim() : ""
    const managerUuid = typeof body.managerUuid === "string" ? body.managerUuid.trim() : ""

    const missingFields = []
    if (!uuid) missingFields.push("uuid")
    if (!comment) missingFields.push("comment")
    if (!managerUuid) missingFields.push("managerUuid")

    if (missingFields.length) {
        throw new BadRequestError(`Отсутствуют обязательные поля: ${missingFields.join(", ")}`)
    }

    return {
        uuid,
        comment,
        managerUuid,
    }
}

const normalizeLoanApplicationDataIn = (rawDataIn: LoanApplication["dataIn"]): LoanApplicationDataIn => {
    let parsed: unknown = rawDataIn

    if (typeof rawDataIn === "string") {
        try {
            parsed = JSON.parse(rawDataIn) as LoanApplicationDataIn
        } catch {
            throw new BadRequestError("Не удалось распарсить данные заявки на кредит")
        }
    }

    if (!parsed || typeof parsed !== "object") {
        throw new BadRequestError("Данные заявки на кредит имеют неверный формат")
    }

    const dataIn = parsed as LoanApplicationDataIn

    if (dataIn.type !== "LOAN_APPLICATION") {
        throw new BadRequestError("Указанная сделка не является заявкой на кредит")
    }

    return dataIn
}

export const onRequestPut = async (context: RequestContext): Promise<Response> => {
    const { request, env } = context

    try {
        const payload = await parseAdditionalInfoRequestPayload(request)
        const dealsRepository = new DealsRepository()

        const existingDeal = (await dealsRepository.findByUuid(payload.uuid)) as LoanApplication | undefined

        if (!existingDeal) {
            throw new BadRequestError("Заявка на кредит не найдена", 404)
        }

        // Get client's humanHaid from deal
        if (!existingDeal.clientAid) {
            throw new BadRequestError("Клиент не найден в заявке", 404)
        }

        const clientHaid = existingDeal.clientAid

        // Get admin's humanHaid from managerUuid
        const usersRepository = UsersRepository.getInstance()
        const managerUser = await usersRepository.findByUuid(payload.managerUuid)
        
        if (!managerUser) {
            throw new BadRequestError("Менеджер не найден", 404)
        }

        if (!managerUser.humanAid) {
            throw new BadRequestError("У менеджера не указан humanAid", 400)
        }

        const adminHaid = managerUser.humanAid

        // Create support chat from client's perspective
        const messageThreadsRepository = MessageThreadsRepository.getInstance()
        const requestEnv = env ?? buildRequestEnv()
        
        const subject = `Запрос дополнительной информации по заявке #${existingDeal.id}`
        const chat = await messageThreadsRepository.startNewSupportChat(
            clientHaid,
            subject,
            requestEnv
        )

        // Assign manager to chat
        await messageThreadsRepository.assignManager(chat.maid, adminHaid)

        // Add message from admin
        await messageThreadsRepository.addMessageToSupportChat(
            chat.maid,
            payload.comment,
            'text',
            adminHaid,
            'admin'
        )

        const currentDataIn = normalizeLoanApplicationDataIn(existingDeal.dataIn)

        const result = await dealsRepository.updateLoanApplicationDeal(payload.uuid, {
            statusName: "ADDITIONAL_INFO_REQUESTED",
            dataIn: {
                ...currentDataIn,
                additionalInfoRequest: {
                    comment: payload.comment,
                },
            },
        })

        return new Response(
            JSON.stringify({
                success: true,
                message: "Запрошена дополнительная информация",
                deal: result.updatedDeal,
                journal: result.journal,
                chat: {
                    uuid: chat.uuid,
                    maid: chat.maid,
                },
            }),
            {
                status: 200,
                headers: jsonHeaders,
            },
        )
    } catch (error) {
        const status = error instanceof BadRequestError ? error.status : 500
        const message = error instanceof Error ? error.message : "Неожиданная ошибка"

        console.error("Failed to request additional info for loan application", error)

        return new Response(
            JSON.stringify({
                success: false,
                error: status === 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST",
                message,
            }),
            {
                status,
                headers: jsonHeaders,
            },
        )
    }
}

export const onRequestOptions = async () =>
    new Response(null, {
        status: 204,
        headers: loanDecisionCorsHeaders,
    })

type HandlerContext = Parameters<typeof onRequestPut>[0]

export const PUT = withAdminGuard(onRequestPut)

export async function OPTIONS() {
    return onRequestOptions()
}



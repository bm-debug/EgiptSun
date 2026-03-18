/// <reference types="@cloudflare/workers-types" />

import { handleLoanDecision, loanDecisionCorsHeaders } from "../decision-handler"
import { withAdminGuard } from '@/shared/api-guard'

type RequestContext = Parameters<typeof handleLoanDecision>[0]

const handlePut = (context: RequestContext) => {
    return handleLoanDecision(context, {
        statusName: "APPROVED",
        successMessage: "Заявка на кредит одобрена",
        operation: "approve",
    })
}

export const PUT = withAdminGuard(handlePut)

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: loanDecisionCorsHeaders,
    })
}

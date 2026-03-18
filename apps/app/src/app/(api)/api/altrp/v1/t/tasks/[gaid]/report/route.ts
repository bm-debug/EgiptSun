import { NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withTesterGuard } from "@/shared/api-guard"
import { GoalsRepository } from "@/shared/repositories/goals.repository"
import { parseJson } from "@/shared/repositories/utils"

async function handlePost(context: AuthenticatedRequestContext) {
  try {
    const { request, user, params } = context
    const gaid = (params as { gaid?: string })?.gaid

    if (!user.humanAid) {
      return NextResponse.json(
        { success: false, error: "USER_HAS_NO_HUMAN_PROFILE" },
        { status: 400 }
      )
    }

    if (!gaid) {
      return NextResponse.json(
        { success: false, error: "GAID_REQUIRED" },
        { status: 400 }
      )
    }

    const body = (await request.json()) as { dataOut?: Record<string, unknown>; screenshotUrl?: string }
    const { dataOut = {}, screenshotUrl } = body

    const goalsRepo = GoalsRepository.getInstance()
    const allGoals = await goalsRepo.findAll()

    const campaign = allGoals.find(
      (g) => (g.gaid === gaid || g.fullGaid === gaid || g.fullGaid === `G-${gaid}`) && !g.parentFullGaid
    )

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "CAMPAIGN_NOT_FOUND", message: "Кампания не найдена" },
        { status: 404 }
      )
    }

    const execution = allGoals.find(
      (g) =>
        g.parentFullGaid === campaign.fullGaid &&
        (g.xaid === user.humanAid || parseJson<{ owner?: string }>(g.dataIn || "", {}).owner === user.humanAid)
    )

    if (!execution) {
      return NextResponse.json(
        { success: false, error: "EXECUTION_NOT_FOUND", message: "Сначала начните задание" },
        { status: 400 }
      )
    }

    if (execution.statusName === "approved" || execution.statusName === "rejected") {
      return NextResponse.json(
        { success: false, error: "ALREADY_REVIEWED", message: "Отчёт уже проверен" },
        { status: 400 }
      )
    }

    const mergedDataOut = {
      ...parseJson<Record<string, unknown>>(execution.dataOut || "", {}),
      ...dataOut,
      ...(screenshotUrl && { screenshotUrl }),
      submittedAt: new Date().toISOString(),
    }

    await goalsRepo.update(execution.uuid, {
      dataOut: mergedDataOut,
      statusName: "pending_review",
    })

    const updated = await goalsRepo.findByUuid(execution.uuid)

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error("[POST /api/altrp/v1/t/tasks/[gaid]/report]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: String(error) },
      { status: 500 }
    )
  }
}

export const POST = withTesterGuard(handlePost)

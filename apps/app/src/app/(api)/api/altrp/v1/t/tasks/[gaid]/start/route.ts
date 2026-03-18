import { NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withTesterGuard } from "@/shared/api-guard"
import { GoalsRepository } from "@/shared/repositories/goals.repository"
import { parseJson } from "@/shared/repositories/utils"
import { generateAid } from "@/shared/generate-aid"

async function handlePost(context: AuthenticatedRequestContext) {
  try {
    const { user, params } = context
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

    const existingExecution = allGoals.find(
      (g) =>
        g.parentFullGaid === campaign.fullGaid &&
        (g.xaid === user.humanAid || parseJson<{ owner?: string }>(g.dataIn || "", {}).owner === user.humanAid)
    )

    if (existingExecution) {
      return NextResponse.json({
        success: true,
        data: existingExecution,
        message: "TASK_ALREADY_STARTED",
      })
    }

    const newGaid = generateAid("g")
    const executionDataIn = {
      owner: user.humanAid,
      campaignGaid: campaign.gaid,
      campaignFullGaid: campaign.fullGaid,
    }

    const execution = await goalsRepo.create({
      uuid: crypto.randomUUID(),
      gaid: newGaid,
      fullGaid: newGaid,
      parentFullGaid: campaign.fullGaid,
      title: `Выполнение: ${campaign.title || "Задание"} (${user.humanAid})`,
      type: "task_execution",
      statusName: "in_progress",
      cycle: "ONCE",
      order: "0",
      isPublic: 0,
      xaid: user.humanAid,
      dataIn: executionDataIn,
    })

    return NextResponse.json({
      success: true,
      data: execution,
    })
  } catch (error) {
    console.error("[POST /api/altrp/v1/t/tasks/[gaid]/start]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: String(error) },
      { status: 500 }
    )
  }
}

export const POST = withTesterGuard(handlePost)

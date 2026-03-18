import { NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withTesterGuard } from "@/shared/api-guard"
import { GoalsRepository } from "@/shared/repositories/goals.repository"
import { parseJson } from "@/shared/repositories/utils"

async function handleGet(context: AuthenticatedRequestContext) {
  try {
    const { request, user } = context

    if (!user.humanAid) {
      return NextResponse.json(
        { success: false, error: "USER_HAS_NO_HUMAN_PROFILE" },
        { status: 400 }
      )
    }

    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"))
    const limit = Math.max(1, Number(url.searchParams.get("limit") || "20"))

    const goalsRepo = GoalsRepository.getInstance()
    const allGoals = await goalsRepo.findAll()

    const myExecutions = allGoals.filter((g) => {
      if (!g.parentFullGaid) return false
      const dataIn = parseJson<{ owner?: string }>(g.dataIn || "", {})
      return g.xaid === user.humanAid || dataIn.owner === user.humanAid
    })

    const withCampaigns = myExecutions.map((exec) => {
      const campaign = allGoals.find((c) => c.fullGaid === exec.parentFullGaid && !c.parentFullGaid)
      const campaignDataIn = campaign
        ? parseJson<{ rewardPerReport?: number; gameId?: string }>(campaign.dataIn || "", {})
        : {}
      return {
        ...exec,
        campaign: campaign ? { title: campaign.title, gaid: campaign.gaid, rewardPerReport: campaignDataIn.rewardPerReport } : null,
      }
    })

    const total = withCampaigns.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginated = withCampaigns.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: { page, limit, total, totalPages },
    })
  } catch (error) {
    console.error("[GET /api/altrp/v1/t/my-tasks]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: String(error) },
      { status: 500 }
    )
  }
}

export const GET = withTesterGuard(handleGet)

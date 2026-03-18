import { NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withTesterGuard } from "@/shared/api-guard"
import { GoalsRepository } from "@/shared/repositories/goals.repository"
import { ProductsRepository } from "@/shared/repositories/products.repository"
import { parseJson } from "@/shared/repositories/utils"

async function handleGet(context: AuthenticatedRequestContext) {
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
    const productsRepo = ProductsRepository.getInstance()
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

    const dataIn = parseJson<{
      gameId?: string
      rewardPerReport?: number
      description?: string
      instructions?: string
      platformRequirement?: string
      questionnaire?: Array<{ id: string; type: string; label: string; options?: string[] }>
      build?: string
    }>(campaign.dataIn || "", {})

    let game = null
    if (dataIn.gameId) {
      try {
        game = await productsRepo.findByPaid(dataIn.gameId)
      } catch {
        // ignore
      }
    }

    const gameDataIn = game
      ? parseJson<{ genres?: string[]; platforms?: string[]; coverImage?: string; description?: string }>(
          (game as any).dataIn || "",
          {}
        )
      : {}

    const testerExecution = allGoals.find(
      (g) =>
        g.parentFullGaid === campaign.fullGaid &&
        (g.xaid === user.humanAid || parseJson<{ owner?: string }>(g.dataIn || "", {}).owner === user.humanAid)
    )

    return NextResponse.json({
      success: true,
      data: {
        campaign,
        game,
        rewardPoints: dataIn.rewardPerReport || 0,
        description: dataIn.description || gameDataIn.description,
        instructions: dataIn.instructions || "",
        questionnaire: dataIn.questionnaire || [],
        build: dataIn.build,
        platform: dataIn.platformRequirement || gameDataIn.platforms?.[0],
        coverImage: gameDataIn.coverImage,
        myExecution: testerExecution
          ? {
              gaid: testerExecution.gaid,
              fullGaid: testerExecution.fullGaid,
              statusName: testerExecution.statusName,
              dataOut: testerExecution.dataOut,
            }
          : null,
      },
    })
  } catch (error) {
    console.error("[GET /api/altrp/v1/t/tasks/[gaid]]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: String(error) },
      { status: 500 }
    )
  }
}

export const GET = withTesterGuard(handleGet)

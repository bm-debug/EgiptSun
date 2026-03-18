import { NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withTesterGuard } from "@/shared/api-guard"
import { GoalsRepository } from "@/shared/repositories/goals.repository"
import { ProductsRepository } from "@/shared/repositories/products.repository"
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
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") || "20"), 50))

    const goalsRepo = GoalsRepository.getInstance()
    const productsRepo = ProductsRepository.getInstance()

    const allGoals = await goalsRepo.findAll()

    const availableCampaigns = allGoals.filter((goal) => {
      const dataIn = parseJson<{ gameId?: string; owner?: string; type?: string }>(goal.dataIn || "", {})
      const goalType = goal.type || ""
      const statusName = goal.statusName || ""

      if (goal.parentFullGaid) return false
      if (goalType !== "TESTING_CAMPAIGN" && !["bugtest", "playtest", "survey"].includes(goalType)) {
        if (!["bugtest", "playtest", "survey"].includes(dataIn.type || "")) return false
      }
      if (statusName !== "active" && statusName !== "draft") return false

      return !!dataIn.gameId
    })

    const campaignsWithGames = await Promise.all(
      availableCampaigns.map(async (goal) => {
        const dataIn = parseJson<{
          gameId?: string
          rewardPerReport?: number
          description?: string
          platformRequirement?: string
          type?: string
        }>(goal.dataIn || "", {})
        const gameId = dataIn.gameId
        let game = null
        if (gameId) {
          try {
            game = await productsRepo.findByPaid(gameId)
          } catch {
            // ignore
          }
        }
        const gameDataIn = game ? parseJson<{ genres?: string[]; platforms?: string[]; coverImage?: string }>((game as any).dataIn || "", {}) : {}
        return {
          ...goal,
          game,
          rewardPoints: dataIn.rewardPerReport || 0,
          platform: dataIn.platformRequirement || gameDataIn.platforms?.[0] || "PC",
          genres: gameDataIn.genres || [],
          coverImage: gameDataIn.coverImage,
        }
      })
    )

    const total = campaignsWithGames.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginated = campaignsWithGames.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: { page, limit, total, totalPages },
    })
  } catch (error) {
    console.error("[GET /api/altrp/v1/t/tasks]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: String(error) },
      { status: 500 }
    )
  }
}

export const GET = withTesterGuard(handleGet)

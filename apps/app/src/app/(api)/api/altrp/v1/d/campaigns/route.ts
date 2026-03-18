import { NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withAllowedRoleGuard } from "@/shared/api-guard"
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

    const repository = GoalsRepository.getInstance()
    const allGoals = await repository.findAll()

    // Filter by developer's games
    const developerCampaigns = allGoals.filter((goal) => {
      const dataIn = parseJson<{ gameId?: string; owner?: string }>(goal.dataIn || "", {})
      // Check if campaign belongs to developer's games
      return dataIn.owner === user.humanAid || dataIn.gameId
    })

    const total = developerCampaigns.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedCampaigns = developerCampaigns.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: paginatedCampaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error("[GET /api/altrp/v1/d/campaigns]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: String(error) },
      { status: 500 }
    )
  }
}

async function handlePost(context: AuthenticatedRequestContext) {
  const { request, user } = context
  let body: any

  try {

    if (!user.humanAid) {
      return NextResponse.json(
        { success: false, error: "USER_HAS_NO_HUMAN_PROFILE" },
        { status: 400 }
      )
    }

    body = (await request.json()) as any
    const {
      gameId,
      title,
      type,
      rewardPerReport,
      participantLimit,
      totalBudget,
      description,
      minimumPlaytime,
      platformRequirement,
      screenRecordingRequired,
      build,
      questionnaire,
    } = body

    if (!title || !gameId) {
      return NextResponse.json(
        { success: false, error: "TITLE_AND_GAME_ID_REQUIRED" },
        { status: 400 }
      )
    }

    const repository = GoalsRepository.getInstance()

    // Create goal (campaign)
    // gaid will be generated automatically in beforeCreate hook
    const campaignDataIn = {
      gameId,
      owner: user.humanAid,
      type: type || "bugtest",
      rewardPerReport: rewardPerReport || 100,
      participantLimit: participantLimit || 50,
      totalBudget: totalBudget || rewardPerReport * participantLimit,
      description: description || "",
      minimumPlaytime,
      platformRequirement,
      screenRecordingRequired: screenRecordingRequired || false,
      build: build || "",
      questionnaire: questionnaire || [],
    }

    console.log("[POST /api/altrp/v1/d/campaigns] Creating campaign with data:", {
      title,
      gameId,
      type: type || "bugtest",
      campaignDataIn,
    })

    const newCampaign = await repository.create({
      uuid: crypto.randomUUID(),
      title: typeof title === "string" ? title : JSON.stringify(title),
      status_name: "draft", // Start as draft, will be activated after funds are frozen
      type: "TESTING_CAMPAIGN", // Custom type for testing campaigns
      cycle: "ONCE", // Required field for goals
      order: "0", // Required field for goals
      is_public: 1, // Default to public
      dataIn: campaignDataIn,
    })

    console.log("[POST /api/altrp/v1/d/campaigns] Campaign created successfully:", {
      id: newCampaign.id,
      uuid: newCampaign.uuid,
      gaid: (newCampaign as any).gaid,
    })

    return NextResponse.json({
      success: true,
      data: newCampaign,
    })
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "Unknown"
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error("[POST /api/altrp/v1/d/campaigns] Error creating campaign:", {
      errorName,
      errorMessage,
      errorStack,
      // Don't rely on destructured variables here – log raw body and user instead
      body,
      user: user?.humanAid,
    })
    
    return NextResponse.json(
      { 
        success: false, 
        error: "INTERNAL_ERROR", 
        message: errorMessage || "Не удалось создать кампанию",
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    )
  }
}

// Allow both "developer" and "Разработчик" role names
export const GET = withAllowedRoleGuard(handleGet, ["developer", "Разработчик"])
export const POST = withAllowedRoleGuard(handlePost, ["developer", "Разработчик"])

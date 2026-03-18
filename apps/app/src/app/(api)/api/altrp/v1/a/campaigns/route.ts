import { NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withAdministratorGuard } from "@/shared/api-guard"
import { GoalsRepository } from "@/shared/repositories/goals.repository"
import { parseJson } from "@/shared/repositories/utils"

async function handleGet(context: AuthenticatedRequestContext) {
  try {
    const { request } = context

    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"))
    const limit = Math.max(1, Number(url.searchParams.get("limit") || "20"))

    const repository = GoalsRepository.getInstance()
    const allGoals = await repository.findAll()

    // Return all campaigns (no filter for administrator)
    const total = allGoals.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedCampaigns = allGoals.slice(offset, offset + limit)

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
    console.error("[GET /api/altrp/v1/a/campaigns]", error)
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

    const newCampaign = await repository.create({
      uuid: crypto.randomUUID(),
      title: typeof title === "string" ? title : JSON.stringify(title),
      status_name: "draft",
      type: "TESTING_CAMPAIGN",
      cycle: "ONCE",
      order: "0",
      is_public: 1,
      dataIn: campaignDataIn,
    })

    return NextResponse.json({
      success: true,
      data: newCampaign,
    })
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "Unknown"
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error("[POST /api/altrp/v1/a/campaigns] Error creating campaign:", {
      errorName,
      errorMessage,
      errorStack,
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

export const GET = withAdministratorGuard(handleGet)
export const POST = withAdministratorGuard(handlePost)

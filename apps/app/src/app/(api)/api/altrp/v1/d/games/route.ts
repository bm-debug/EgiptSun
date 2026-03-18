import { NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withAllowedRoleGuard } from "@/shared/api-guard"
import { ProductsRepository } from "@/shared/repositories/products.repository"
import { parseJson } from "@/shared/repositories/utils"
import { generateAid } from "@/shared/generate-aid"

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
    const paid = url.searchParams.get("paid")
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"))
    const limit = Math.max(1, Number(url.searchParams.get("limit") || "20"))

    const repository = ProductsRepository.getInstance()

    // If paid parameter is provided, return single game
    if (paid) {
      const game = await repository.findByPaid(paid)
      if (!game) {
        return NextResponse.json(
          { success: false, error: "GAME_NOT_FOUND", message: "Игра не найдена" },
          { status: 404 }
        )
      }
      
      // Check if game belongs to this developer
      const dataIn = parseJson<{ owner?: string }>(game.dataIn || "", {})
      if (dataIn.owner !== user.humanAid) {
        return NextResponse.json(
          { success: false, error: "FORBIDDEN", message: "Доступ запрещен" },
          { status: 403 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: [game],
      })
    }

    // Get all products and filter by owner in data_in
    const allProducts = await repository.findAll()
    
    // Filter by owner
    const developerGames = allProducts.filter((product) => {
      const dataIn = parseJson<{ owner?: string }>(product.dataIn || "", {})
      return dataIn.owner === user.humanAid
    })

    const total = developerGames.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedGames = developerGames.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      data: paginatedGames,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error("[GET /api/altrp/v1/d/games]", error)
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: String(error) },
      { status: 500 }
    )
  }
}

async function handlePost(context: AuthenticatedRequestContext) {
  let body: any = null
  let user: any = null
  
  try {
    const { request, user: contextUser } = context
    user = contextUser

    console.log("[POST /api/altrp/v1/d/games] User info:", {
      userId: user?.id,
      email: user?.email,
      humanAid: user?.humanAid,
      roles: user?.roles?.map((r: any) => ({ name: r.name, uuid: r.uuid })),
      isActive: user?.user?.isActive,
    })

    if (!user?.humanAid) {
      console.error("[POST /api/altrp/v1/d/games] User has no humanAid:", {
        userId: user?.id,
        email: user?.email,
        roles: user?.roles?.map((r: any) => r.name),
      })
      return NextResponse.json(
        { success: false, error: "USER_HAS_NO_HUMAN_PROFILE", message: "Профиль пользователя не найден" },
        { status: 400 }
      )
    }

    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[POST /api/altrp/v1/d/games] Failed to parse request body:", parseError)
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST_BODY", message: "Неверный формат данных запроса" },
        { status: 400 }
      )
    }

    const { title, data_in } = body

    if (!title || (typeof title === "string" && title.trim() === "")) {
      console.error("[POST /api/altrp/v1/d/games] Title is missing or empty:", { title })
      return NextResponse.json(
        { success: false, error: "TITLE_REQUIRED", message: "Название игры обязательно" },
        { status: 400 }
      )
    }

    const repository = ProductsRepository.getInstance()

    // Generate UUID and paid (paid must be 6 characters: p-XXXXXX)
    const uuid = crypto.randomUUID()
    const paid = generateAid('p')

    // Create product (game)
    const gameDataIn = {
      owner: user.humanAid,
      genre: data_in?.genre || "",
      ...data_in,
    }

    const createPayload = {
      uuid,
      paid,
      title: typeof title === "string" ? title : JSON.stringify(title),
      category: null,
      statusName: null,
      dataIn: gameDataIn,
    }

    console.log("[POST /api/altrp/v1/d/games] Creating game with payload:", {
      uuid,
      paid,
      title: createPayload.title,
      owner: gameDataIn.owner,
    })

    const newGame = await repository.create(createPayload)

    console.log("[POST /api/altrp/v1/d/games] Game created successfully:", {
      uuid: newGame.uuid,
      paid: newGame.paid,
    })

    return NextResponse.json({
      success: true,
      data: newGame,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : "UnknownError"
    
    console.error("[POST /api/altrp/v1/d/games] Error:", error)
    console.error("[POST /api/altrp/v1/d/games] Error details:", {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
      body,
      user: user?.humanAid,
      userId: user?.id,
    })
    
    // Return more detailed error information
    return NextResponse.json(
      { 
        success: false, 
        error: errorName === "Error" ? "INTERNAL_ERROR" : errorName,
        message: errorMessage || "Не удалось создать игру",
        ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
      },
      { status: 500 }
    )
  }
}

// Allow both "developer" and "Разработчик" role names
export const GET = withAllowedRoleGuard(handleGet, ["developer"])
export const POST = withAllowedRoleGuard(handlePost, ["developer"])

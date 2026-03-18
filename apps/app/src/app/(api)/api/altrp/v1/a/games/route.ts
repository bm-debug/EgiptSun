import { NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withAdministratorGuard } from "@/shared/api-guard"
import { ProductsRepository } from "@/shared/repositories/products.repository"
import { parseJson } from "@/shared/repositories/utils"
import { generateAid } from "@/shared/generate-aid"

async function handleGet(context: AuthenticatedRequestContext) {
  try {
    const { request } = context

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
      
      return NextResponse.json({
        success: true,
        data: [game],
      })
    }

    // Get all products (no filter for administrator)
    const allProducts = await repository.findAll()

    const total = allProducts.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedGames = allProducts.slice(offset, offset + limit)

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
    console.error("[GET /api/altrp/v1/a/games]", error)
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

    if (!user?.humanAid) {
      return NextResponse.json(
        { success: false, error: "USER_HAS_NO_HUMAN_PROFILE", message: "Профиль пользователя не найден" },
        { status: 400 }
      )
    }

    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "INVALID_REQUEST_BODY", message: "Неверный формат данных запроса" },
        { status: 400 }
      )
    }

    const { title, data_in } = body

    if (!title || (typeof title === "string" && title.trim() === "")) {
      return NextResponse.json(
        { success: false, error: "TITLE_REQUIRED", message: "Название игры обязательно" },
        { status: 400 }
      )
    }

    const repository = ProductsRepository.getInstance()

    const uuid = crypto.randomUUID()
    const paid = generateAid('p')

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

    const newGame = await repository.create(createPayload)

    return NextResponse.json({
      success: true,
      data: newGame,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : "UnknownError"
    
    console.error("[POST /api/altrp/v1/a/games] Error:", error)
    
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

export const GET = withAdministratorGuard(handleGet)
export const POST = withAdministratorGuard(handlePost)

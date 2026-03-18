import { NextRequest, NextResponse } from "next/server"
import type { AuthenticatedRequestContext } from "@/shared/api-guard"
import { withTesterGuard } from "@/shared/api-guard"
import { FileStorageService } from "@/shared/services/storage/file-storage.service"

/**
 * POST /api/altrp/v1/t/upload
 * Upload screenshot for tester report
 */
async function handlePost(context: AuthenticatedRequestContext, request: Request): Promise<Response> {
  try {
    const { user } = context

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Файл не предоставлен" },
        { status: 400 }
      )
    }

    const finalFilename = file.name || `screenshot-${Date.now()}.png`
    const entityUuid = crypto.randomUUID()

    const fileStorageService = FileStorageService.getInstance()
    const media = await fileStorageService.uploadFile(
      file,
      entityUuid,
      finalFilename,
      user.humanAid || undefined,
      true
    )

    return NextResponse.json(
      {
        success: true,
        url: media.url,
        data: { uuid: media.uuid, fileName: media.fileName, url: media.url },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/altrp/v1/t/upload]", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Не удалось загрузить файл",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return withTesterGuard((ctx: AuthenticatedRequestContext) => handlePost(ctx, request))(request)
}

import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'

/**
 * POST /api/altrp/v1/admin/files/upload-for-public
 * Upload file for public use
 * Body: FormData with 'file' (required), 'entityUuid' (optional), 'filename' (optional)
 */
const handlePost = async (
  context: AuthenticatedRequestContext,
  request: Request
): Promise<Response> => {
  try {
    const { user } = context

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const entityUuid = formData.get('entityUuid') as string | null
    const filename = formData.get('filename') as string | null

    // Validate file
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Файл не предоставлен',
        },
        { status: 400 }
      )
    }

    // Use provided filename or file.name
    const finalFilename = filename || file.name

    if (!finalFilename) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Имя файла не указано',
        },
        { status: 400 }
      )
    }

    // Generate entityUuid if not provided
    const finalEntityUuid: string = entityUuid || crypto.randomUUID()

    // Upload file with isPublic=true
    const fileStorageService = FileStorageService.getInstance()
    const media = await fileStorageService.uploadFile(
      file,
      finalEntityUuid,
      finalFilename,
      user.humanAid || undefined,
      true // isPublic = true
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Файл успешно загружен',
        data: {
          uuid: media.uuid,
          fileName: media.fileName,
          mimeType: media.mimeType,
          sizeBytes: media.sizeBytes,
          url: media.url,
          isPublic: media.isPublic,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error)
    const message = error instanceof Error ? error.message : 'Не удалось загрузить файл'

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handlePost(ctx, request)
  })(request)
}


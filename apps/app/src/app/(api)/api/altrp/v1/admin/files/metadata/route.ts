import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'

/**
 * POST /api/altrp/v1/admin/files/metadata
 * Returns metadata for multiple files by UUIDs
 * Body: { uuids: string[] }
 */
const handlePost = async (
  context: AuthenticatedRequestContext,
  request: Request
): Promise<Response> => {
  try {
    const body = await request.json() as { uuids?: string[] }
    
    if (!body.uuids || !Array.isArray(body.uuids)) {
      return NextResponse.json(
        { error: 'Массив UUID обязателен' },
        { status: 400 }
      )
    }

    const fileStorageService = FileStorageService.getInstance()
    const metadataList = []

    for (const uuid of body.uuids) {
      try {
        const metadata = await fileStorageService.getMediaMetadata(uuid)
        if (metadata) {
          metadataList.push({
            uuid: metadata.uuid,
            fileName: metadata.fileName,
            mimeType: metadata.mimeType,
            sizeBytes: metadata.sizeBytes,
            url: metadata.url,
          })
        }
      } catch (error) {
        console.error(`Ошибка при получении метаданных для ${uuid}:`, error)
        // Продолжаем с другими файлами даже если один не найден
      }
    }
    
    return NextResponse.json({
      success: true,
      metadata: metadataList,
    })
  } catch (error) {
    console.error('Ошибка при получении метаданных файлов:', error)
    const message = error instanceof Error ? error.message : 'Не удалось получить метаданные'
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
) {
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handlePost(ctx, request)
  })(request)
}


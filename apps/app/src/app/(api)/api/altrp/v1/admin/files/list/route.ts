import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { MediaRepository } from '@/shared/repositories/media.repository'
import { eq, and, like, or, isNull, desc, isNotNull } from 'drizzle-orm'
import { schema } from '@/shared/schema'

/**
 * GET /api/altrp/v1/admin/files/list
 * Returns list of public files with optional search
 * Query params: search (optional), page (optional, default 1), limit (optional, default 50)
 */
const handleGet = async (
  context: AuthenticatedRequestContext,
  request: Request
): Promise<Response> => {
  try {
    const url = new URL(request.url)
    const searchQuery = url.searchParams.get('search') || ''
    const page = Math.max(1, Number(url.searchParams.get('page') || 1))
    const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') || 50), 100))

    const mediaRepository = MediaRepository.getInstance()

    // Build filters for public files only
    // Use explicit conditions to ensure they are applied
    // Check that isPublic is not null and equals true; show only images
    const whereConditions = and(
      isNotNull(schema.media.isPublic), // isPublic is not NULL
      eq(schema.media.isPublic, true), // Only public files (isPublic = true)
      eq(schema.media.type, 'image'), // Only images
      isNull(schema.media.deletedAt) // Not deleted
    )

    // Add search condition if provided
    let finalWhere = whereConditions
    if (searchQuery.trim()) {
      const searchPattern = `%${searchQuery.trim()}%`
      const searchCondition = or(
        like(schema.media.fileName, searchPattern),
        like(schema.media.title, searchPattern),
        like(schema.media.altText, searchPattern)
      )!
      finalWhere = and(whereConditions, searchCondition)
    }

    // Get total count
    const countQuery = mediaRepository.getSelectQuery()
    const totalRows = await countQuery.where(finalWhere).execute()
    const total = totalRows.length

    // Get paginated results
    const offset = (page - 1) * limit
    const query = mediaRepository.getSelectQuery()
    const result = await query
      .where(finalWhere)
      .orderBy(desc(schema.media.createdAt))
      .limit(limit)
      .offset(offset)
      .execute()

    // Format response
    const files = result.map((media: any) => ({
      uuid: media.uuid,
      fileName: media.fileName,
      title: media.title || media.fileName,
      url: media.url || `/api/altrp/v1/admin/files/${media.uuid}`,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      type: media.type,
      alt: media.altText,
      createdAt: media.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: files,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error('Ошибка при получении списка файлов:', error)
    const message = error instanceof Error ? error.message : 'Не удалось получить список файлов'

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

export async function GET(request: NextRequest) {
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx, request)
  })(request)
}


import { NextRequest, NextResponse } from 'next/server'
import { withAllowedRoleGuard, withRoleGuard, type AuthenticatedRequestContext } from '@/shared/api-guard'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'

/**
 * Encodes filename according to RFC 5987
 */
function encodeRFC5987ValueChars(str: string): string {
  return encodeURIComponent(str)
    .replace(/['()]/g, (char) => {
      const code = char.charCodeAt(0)
      return '%' + code.toString(16).toUpperCase().padStart(2, '0')
    })
    .replace(/\*/g, '%2A')
}

/**
 * GET /api/altrp/v1/media/[uuid]
 * Returns file content by UUID for current human (client or investor).
 * Access is allowed only if the media was uploaded by the current human (uploaderAid).
 */
const handleGet = async (
  context: AuthenticatedRequestContext,
  uuid: string,
): Promise<Response> => {
  try {
    const { user } = context

    const isAdmin = user.roles?.some(
      (role) => role.name === 'Administrator' || role.name === 'admin',
    )

    if (!isAdmin && !user.humanAid) {
      return NextResponse.json(
        { error: 'Human profile not found' },
        { status: 404 },
      )
    }

    const fileStorageService = FileStorageService.getInstance()

    // Get file metadata
    const mediaMetadata = await fileStorageService.getMediaMetadata(uuid)

    if (!mediaMetadata) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 404 },
      )
    }

    // Verify file belongs to the current human (check uploaderAid) for non-admins only
    if (!isAdmin && mediaMetadata.uploaderAid !== user.humanAid) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 },
      )
    }

    // Get file content
    const fileContent = await fileStorageService.getFileContent(uuid)

    // Determine content type
    const contentType = mediaMetadata.mimeType || 'application/octet-stream'

    // Encode filename for Content-Disposition header
    const fileName = mediaMetadata.fileName || 'file'

    // Create ASCII-only filename
    const asciiSafeFileName = fileName
      .split('')
      .map((char) => {
        const code = char.charCodeAt(0)
        if (code >= 32 && code <= 126) {
          if (char === '"' || char === '\\') return '_'
          return char
        }
        return '_'
      })
      .join('')
      .replace(/\s+/g, '_')
      .substring(0, 100)

    const encodedFileName = encodeRFC5987ValueChars(fileName)
    const contentDisposition = `inline; filename="${asciiSafeFileName}"; filename*=UTF-8''${encodedFileName}`

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=3600')
    headers.set('Content-Disposition', contentDisposition)

    return new Response(fileContent, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Ошибка при получении файла через /media:', error)
    const message = error instanceof Error ? error.message : 'Не удалось получить файл'

    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> },
) {
  const params = await context.params
  return withAllowedRoleGuard(
    async (ctx: AuthenticatedRequestContext) => {
      return handleGet(ctx, params.uuid)
    },
    ['client', 'investor', 'Administrator', 'admin'],
  )(request, { params: Promise.resolve(params) })
}


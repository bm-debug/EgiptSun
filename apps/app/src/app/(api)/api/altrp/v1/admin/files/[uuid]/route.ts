import { NextRequest, NextResponse } from 'next/server'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
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
 * GET /api/altrp/v1/admin/files/[uuid]
 * Returns file content by UUID for admin viewing
 */
const handleGet = async (
  context: AuthenticatedRequestContext,
  uuid: string
): Promise<Response> => {
  try {
    const fileStorageService = FileStorageService.getInstance()
    
    // Get file metadata
    const mediaMetadata = await fileStorageService.getMediaMetadata(uuid)
    
    if (!mediaMetadata) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 404 }
      )
    }

    // Get file content
    const fileContent = await fileStorageService.getFileContent(uuid)
    
    // Determine content type
    const contentType = mediaMetadata.mimeType || 'application/octet-stream'
    
    // Encode filename for Content-Disposition header
    // Replace all non-ASCII characters to avoid ByteString errors
    const fileName = mediaMetadata.fileName || 'file'
    
    // Create ASCII-only filename (only printable ASCII characters 32-126)
    // This ensures no ByteString conversion errors
    const asciiSafeFileName = fileName
      .split('')
      .map((char) => {
        const code = char.charCodeAt(0)
        // Keep only printable ASCII (32-126)
        if (code >= 32 && code <= 126) {
          // Escape special characters
          if (char === '"' || char === '\\') return '_'
          return char
        }
        return '_' // Replace non-ASCII with underscore
      })
      .join('')
      .replace(/\s+/g, '_') // Replace whitespace
      .substring(0, 100) // Limit length
    
    // RFC 5987 encoded filename for modern browsers
    const encodedFileName = encodeRFC5987ValueChars(fileName)
    
    // Build Content-Disposition header with both ASCII fallback and RFC 5987
    // Ensure the quoted string contains only ASCII characters
    const contentDisposition = `inline; filename="${asciiSafeFileName}"; filename*=UTF-8''${encodedFileName}`
    
    // Create Headers object
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=3600')
    
    // Set Content-Disposition - ensure it's set as a valid HTTP header string
    headers.set('Content-Disposition', contentDisposition)
    
    // Return file with appropriate headers
    return new Response(fileContent, {
      status: 200,
      headers: headers,
    })
  } catch (error) {
    console.error('Ошибка при получении файла:', error)
    const message = error instanceof Error ? error.message : 'Не удалось получить файл'
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  const params = await context.params
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx, params.uuid)
  })(request, { params: Promise.resolve(params) })
}


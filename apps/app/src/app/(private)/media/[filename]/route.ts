import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'
import { MediaRepository } from '@/shared/repositories/media.repository'
import { eq, and, isNull } from 'drizzle-orm'
import { schema } from '@/shared/schema'

/**
 * GET /media/[filename]
 * Serves public media files by filename
 * No authentication required - public files only
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params
    const decodedFilename = decodeURIComponent(filename)
    const safeFilename = path.basename(decodedFilename)

    if (!safeFilename) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const publicMediaDir = path.join(process.cwd(), 'public', 'media')
    const publicFilePath = path.join(publicMediaDir, safeFilename)

    const getContentType = (fname: string, fallback?: string) => {
      const ext = path.extname(fname).toLowerCase()
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          return 'image/jpeg'
        case '.png':
          return 'image/png'
        case '.webp':
          return 'image/webp'
        case '.gif':
          return 'image/gif'
        case '.svg':
          return 'image/svg+xml'
        default:
          return fallback || 'application/octet-stream'
      }
    }

    // 1) If file already exists in public/media, return it
    try {
      await fs.access(publicFilePath)
      const fileBuffer = await fs.readFile(publicFilePath)
      const headers = new Headers()
      headers.set('Content-Type', getContentType(safeFilename))
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      headers.set(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(safeFilename)}"`
      )
      return new Response(new Uint8Array(fileBuffer), { status: 200, headers })
    } catch {
      // not in filesystem, will try DB
    }

    const mediaRepository = MediaRepository.getInstance()

    // Find media by file_name and ensure it's public
    const where = and(
      eq(schema.media.fileName, safeFilename),
      eq(schema.media.isPublic, true),
      isNull(schema.media.deletedAt)
    )

    const query = mediaRepository.getSelectQuery()
    const result = await query.where(where).execute()

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const media = result[0]

    if (!media || !media.filePath) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Get file content
    const fileStorageService = FileStorageService.getInstance()
    const fileContent = await fileStorageService.getFileContent(media.uuid)
    const arrayBuffer = await fileContent.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Ensure public/media exists and cache file on disk for subsequent requests
    await fs.mkdir(publicMediaDir, { recursive: true })
    await fs.writeFile(publicFilePath, fileBuffer)

    // Determine content type
    const contentType = getContentType(safeFilename, media.mimeType || undefined)

    // Set appropriate headers for public files
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable') // Cache for 1 year
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(safeFilename)}"`)

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Ошибка при получении публичного файла:', error)
    const message = error instanceof Error ? error.message : 'Не удалось получить файл'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}


import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { FilesRepository } from '@/shared/repositories/files.repository'
import { IStorageProvider, StorageSaveResult } from './types'

export class LocalStorageProvider implements IStorageProvider {
  private uploadDir: string

  constructor(uploadDir = '../../data/site') {
    this.uploadDir = path.join(process.cwd(), uploadDir)
  }

  private async ensureUploadDir() {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true })
    }
  }

  async save(file: Blob, filename: string, _mediaUuid: string): Promise<StorageSaveResult> {
    await this.ensureUploadDir()
    
    const ext = path.extname(filename)
    const uniqueName = `${randomUUID()}${ext}`
    const relativePath = path.join('uploads', uniqueName) // Relative path for DB
    const absolutePath = path.join(this.uploadDir, uniqueName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(absolutePath, buffer)

    return {
      path: relativePath,
      url: `/api/assets/${uniqueName}`, // Public URL via API route
      size: file.size,
      mimeType: file.type
    }
  }

  async get(filePath: string): Promise<Blob> {
      // Assuming filePath comes from the DB as 'uploads/filename.ext' or just filename
      // We need to map it back to absolute path in data/site
      const filename = path.basename(filePath)
      const absolutePath = path.join(this.uploadDir, filename)
      
      if (!existsSync(absolutePath)) {
        throw new Error('File not found')
      }

    const buffer = await readFile(absolutePath)
    const uint8 = new Uint8Array(buffer)
    return new Blob([uint8]) 
  }
}

/**
 * Storage provider that keeps file content directly in the database
 * using the `files` table. The `path` returned is a logical handle
 * in the form `db:files:<fileUuid>` which is later used in `get()`.
 */
export class DatabaseStorageProvider implements IStorageProvider {
  private filesRepository: FilesRepository

  constructor() {
    this.filesRepository = FilesRepository.getInstance()
  }

  async save(file: Blob, filename: string, mediaUuid: string): Promise<StorageSaveResult> {
    const buffer = Buffer.from(await file.arrayBuffer())

    const fileRecord = await this.filesRepository.createFile({
      mediaUuid,
      data: buffer,
    } as any)

    const logicalPath = `db:files:${fileRecord.uuid}`

    return {
      path: logicalPath,
      // URL can be implemented via a dedicated API route that reads from DB by file UUID
      url: `/api/assets/${fileRecord.uuid}`,
      size: file.size,
      mimeType: file.type,
    }
  }

  async get(pathValue: string): Promise<Blob> {
    if (!pathValue.startsWith('db:files:')) {
      throw new Error('Invalid database file path')
    }

    const fileUuid = pathValue.replace('db:files:', '')
    const fileRecord = await this.filesRepository.findByUuid(fileUuid)

    if (!fileRecord || !fileRecord.data) {
      throw new Error('File not found')
    }

    const buffer = Buffer.from(fileRecord.data as unknown as Uint8Array)
    const uint8 = new Uint8Array(buffer)
    return new Blob([uint8])
  }
}

import { LocalStorageProvider, DatabaseStorageProvider, IStorageProvider } from './storage.provider'
import { MediaRepository } from '@/shared/repositories/media.repository'
import { NewaltrpMedia } from '@/shared/types/altrp-finance'

export class FileStorageService {
  private provider: IStorageProvider
  private mediaRepository: MediaRepository

  constructor() {
    // Choose storage provider based on environment:
    // FILE_STORAGE_DRIVER=database -> DatabaseStorageProvider
    // otherwise LocalStorageProvider (filesystem)
    this.provider = new DatabaseStorageProvider()
    
    this.mediaRepository = MediaRepository.getInstance()
  }

  public static getInstance(): FileStorageService {
    return new FileStorageService()
  }

  async uploadFile(file: Blob, entityUuid: string, filename: string, uploaderAid?: string, isPublic?: boolean): Promise<any> {
    // 1. Generate media UUID (used both for media record and files table)
    const mediaUuid = crypto.randomUUID()

    // 2. Explicitly set isPublic value (true for public, false for private)
    // This ensures the value is always set, never NULL
    const isPublicValue = isPublic === true

    // 3. First create Media record so that any FK (e.g. in files table) can safely reference it
    const initialMediaData: Partial<NewaltrpMedia> = {
      uuid: mediaUuid,
      fileName: filename,
      mimeType: file.type,
      sizeBytes: file.size.toString(),
      uploaderAid: uploaderAid,
      isPublic: isPublicValue, // Always explicitly set (boolean, never NULL)
      type: file.type?.split('/')[0], // image, application, etc.
      dataIn: { entityUuid },
    }

    const createdMedia = await this.mediaRepository.create(initialMediaData)

    // 4. Save file content using selected storage provider (may create records linked to mediaUuid)
    const savedFile = await this.provider.save(file, filename, mediaUuid)

    // 5. Generate URL based on file visibility
    // Public files use /media/[filename], private files use /api/assets/[uuid]
    const fileUrl = isPublicValue 
      ? `/media/${encodeURIComponent(filename)}`
      : savedFile.url

    // 6. Update Media metadata with actual storage info (path/url/size/mime type)
    // Preserve isPublic value from initial creation
    const updatedMedia = await this.mediaRepository.update(createdMedia.uuid, {
      filePath: savedFile.path,
      mimeType: savedFile.mimeType,
      sizeBytes: savedFile.size.toString(),
      url: fileUrl,
      type: savedFile.mimeType.split('/')[0],
      isPublic: isPublicValue, // Preserve isPublic value (explicitly set)
    } as Partial<NewaltrpMedia>)

    return updatedMedia
  }

  async getFileContent(uuid: string): Promise<Blob> {
    const media = await this.mediaRepository.findByUuid(uuid)
    if (!media || !media.filePath) {
      throw new Error('Media not found')
    }
    
    return this.provider.get(media.filePath)
  }
  
  async getMediaMetadata(uuid: string) {
      return this.mediaRepository.findByUuid(uuid)
  }
}


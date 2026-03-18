export interface IStorageProvider {
  save(file: Blob, filename: string, mediaUuid: string): Promise<StorageSaveResult>
  get(path: string): Promise<Blob>
}

export interface StorageSaveResult {
  path: string
  url: string
  size: number
  mimeType: string
}

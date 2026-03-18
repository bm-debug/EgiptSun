import path from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { IStorageProvider, StorageSaveResult } from './types'

export interface S3StorageProviderConfig {
  endpoint: string
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

/**
 * S3-compatible storage provider (AWS S3, Garage, MinIO, etc.).
 * Stores file path as S3 object key; private files are served via app API.
 */
export class S3StorageProvider implements IStorageProvider {
  private client: S3Client
  private bucket: string

  constructor(config: S3StorageProviderConfig) {
    this.bucket = config.bucket
    this.client = new S3Client({
      endpoint: config.endpoint || undefined,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: !!config.endpoint,
    })
  }

  async save(file: Blob, filename: string, mediaUuid: string): Promise<StorageSaveResult> {
    const ext = path.extname(filename)
    const uniqueName = `${randomUUID()}${ext}`
    const key = `uploads/${uniqueName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      })
    )

    return {
      path: key,
      url: `/api/assets/${mediaUuid}`,
      size: file.size,
      mimeType: file.type,
    }
  }

  async get(pathValue: string): Promise<Blob> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: pathValue,
      })
    )

    if (!response.Body) {
      throw new Error('File not found')
    }

    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    return new Blob([new Uint8Array(buffer)])
  }
}

export function getS3StorageConfigFromEnv(): S3StorageProviderConfig | null {
  const endpoint = process.env.S3_ENDPOINT?.trim()
  const bucket = process.env.S3_BUCKET?.trim()
  const region = process.env.S3_REGION?.trim() || 'garage'
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim()

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null
  }

  return {
    endpoint: endpoint ?? '',
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
  }
}

export function isS3StorageConfigured(): boolean {
  return getS3StorageConfigFromEnv() !== null
}

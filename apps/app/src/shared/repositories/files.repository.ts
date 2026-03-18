import BaseRepository from './BaseRepositroy'
import { schema } from '../schema'
import type { File, NewFile } from '../schema/types'

export class FilesRepository extends BaseRepository<File> {
  constructor() {
    super(schema.files)
  }

  public static getInstance(): FilesRepository {
    return new FilesRepository()
  }

  // Helper to create file record with binary data
  public async createFile(data: Partial<NewFile>): Promise<File> {
    return this.create(data as Partial<File>)
  }
}















































import BaseRepository from './BaseRepositroy'
import { schema } from '../schema'
import { Media, NewMedia } from '../schema/types'
import { generateAid } from '../generate-aid'

export class MediaRepository extends BaseRepository<Media> {
  constructor() {
    super(schema.media)
  }

  public static getInstance(): MediaRepository {
    return new MediaRepository()
  }

  protected async beforeCreate(data: Partial<NewMedia>): Promise<void> {
    if (!data.maid) {
      data.maid = generateAid('m')
    }
  }
}


import { systemSeed } from './system'
import { altrpSeed } from './altrp'

export type SeedMeta = {
  name: string
  versions: Array<{
    version: string
    description: string
    created_at: string
  }>
}

export type SeedData = {
  __meta__: SeedMeta
  [collection: string]: unknown
}

export type SeedDefinition = {
  id: string
  data: SeedData
}

export const seeds: SeedDefinition[] = [
  {
    id: 'system',
    data: systemSeed as unknown as SeedData,
  },
  {
    id: 'altrp',
    data: altrpSeed as unknown as SeedData,
  },
]



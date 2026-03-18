import { NextResponse } from 'next/server'
import { TextsRepository } from '@/shared/repositories/texts.repository'
import type { altrpTextDataIn } from '@/shared/types/altrp'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const textsRepository = TextsRepository.getInstance()
    const docs = await textsRepository.findPublishedByType('BLOG')

    const withParsedDataIn = docs.map((text) => {
      let parsedDataIn: altrpTextDataIn | null = null
      if (text.dataIn) {
        try {
          parsedDataIn =
            typeof text.dataIn === 'string'
              ? (JSON.parse(text.dataIn) as altrpTextDataIn)
              : (text.dataIn as altrpTextDataIn)
        } catch {
          // ignore
        }
      }
      return {
        ...text,
        dataIn: parsedDataIn,
      }
    })

    return NextResponse.json({ docs: withParsedDataIn })
  } catch (error) {
    console.error('Public blog list failed', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR', message },
      { status: 500 }
    )
  }
}

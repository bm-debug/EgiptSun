import { NextRequest, NextResponse } from 'next/server'
import { TextsRepository } from '@/shared/repositories/texts.repository'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { altrpText, NewaltrpText, altrpTextDataIn } from '@/shared/types/altrp'

const handleGet = async (
  context: AuthenticatedRequestContext,
  taid: string
) => {
  const { request } = context
  try {
    const textsRepository = TextsRepository.getInstance()
    const text = await textsRepository.findByTaid(taid)

    if (!text) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
    }

    // Parse dataIn for response
    let parsedDataIn: altrpTextDataIn | null = null
    if (text.dataIn) {
      try {
        if (typeof text.dataIn === 'string') {
          parsedDataIn = JSON.parse(text.dataIn) as altrpTextDataIn
        } else {
          parsedDataIn = text.dataIn as altrpTextDataIn
        }
      } catch (error) {
        console.error('Failed to parse dataIn for text', text.taid, error)
      }
    }

    return NextResponse.json({
      success: true,
      text: {
        ...text,
        dataIn: parsedDataIn,
      } as altrpText,
    })
  } catch (error) {
    console.error('Failed to fetch blog post', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

const handlePut = async (
  context: AuthenticatedRequestContext,
  taid: string
) => {
  const { request } = context
  try {
    const textsRepository = TextsRepository.getInstance()
    const existingText = await textsRepository.findByTaid(taid)

    if (!existingText) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
    }

    const body = await request.json() as Partial<NewaltrpText & { content?: string; dataIn?: altrpTextDataIn }>
    const { title, statusName, category, dataIn, isPublic, content } = body

    const updateData: any = {}

    // Update title if provided
    if (title !== undefined) {
      updateData.title = title
    }

    // Update statusName if provided
    if (statusName !== undefined) {
      updateData.statusName = statusName
    }

    // Update category if provided
    if (category !== undefined) {
      updateData.category = category || null
    }

    // Update isPublic if provided
    if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic)
    }

    // Update content if provided
    if (content !== undefined) {
      updateData.content = content || null
    }

    // Update dataIn if provided
    if (dataIn !== undefined) {
      // Preserve existing date if not provided, or use current date
      const existingDataIn = existingText.dataIn
      let existingDate: string | undefined
      if (existingDataIn) {
        try {
          const parsed = typeof existingDataIn === 'string' 
            ? JSON.parse(existingDataIn) 
            : existingDataIn
          existingDate = parsed?.date
        } catch {
          // Ignore parse errors
        }
      }
      
      const dataInWithDate = {
        ...dataIn,
        date: dataIn.date || existingDate || new Date().toISOString(),
      }
      updateData.dataIn = dataInWithDate
    }

    // Update text
    if (Object.keys(updateData).length > 0 && existingText.uuid) {
      await textsRepository.update(existingText.uuid, updateData)
    }

    // Get updated text
    const updatedText = await textsRepository.findByTaid(taid)
    if (!updatedText) {
      return NextResponse.json({ error: 'Blog post not found after update' }, { status: 404 })
    }

    // Parse dataIn for response
    let parsedDataIn: altrpTextDataIn | null = null
    if (updatedText.dataIn) {
      try {
        if (typeof updatedText.dataIn === 'string') {
          parsedDataIn = JSON.parse(updatedText.dataIn) as altrpTextDataIn
        } else {
          parsedDataIn = updatedText.dataIn as altrpTextDataIn
        }
      } catch (error) {
        console.error('Failed to parse dataIn for updated text', updatedText.taid, error)
      }
    }

    return NextResponse.json({
      success: true,
      text: {
        ...updatedText,
        dataIn: parsedDataIn,
      } as altrpText,
    })
  } catch (error) {
    console.error('Failed to update blog post', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taid: string }> }
) {
  const params = await context.params
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleGet(ctx, params.taid)
  })(request, { params: Promise.resolve(params) })
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ taid: string }> }
) {
  const params = await context.params
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handlePut(ctx, params.taid)
  })(request, { params: Promise.resolve(params) })
}


import { NextRequest, NextResponse } from 'next/server'
import { TextsRepository } from '@/shared/repositories/texts.repository'
import { parseQueryParams } from '@/shared/utils/http'
import { withAdminGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { NewaltrpText, altrpText, altrpTextDataIn } from '@/shared/types/altrp'

const handleGet = async (context: AuthenticatedRequestContext) => {
  const { request } = context
  try {
    const url = new URL(request.url)
    const { filters, orders, pagination } = parseQueryParams(url)

    // Override default order to id desc if no order specified
    if (!orders.orders || orders.orders.length === 0) {
      orders.orders = [{
        field: 'id',
        direction: 'desc',
      }]
    }

    const textsRepository = TextsRepository.getInstance()
    const result = await textsRepository.getFilteredBlog(filters, orders, pagination)

    // Parse dataIn for each text
    const textsWithParsedData = result.docs.map((text) => {
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

      return {
        ...text,
        dataIn: parsedDataIn,
      } as altrpText
    })

    return NextResponse.json({
      docs: textsWithParsedData,
      pagination: result.pagination,
    })
  } catch (error) {
    console.error('Failed to fetch blog posts', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

const handlePost = async (context: AuthenticatedRequestContext) => {
  const { request } = context
  try {
    const body = await request.json() as Partial<NewaltrpText & { content?: string; dataIn?: altrpTextDataIn }>
    const { title, type, statusName, category, dataIn, isPublic, content } = body

    // Validate required fields
    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 })
    }

    // Ensure type is BLOG
    if (type !== 'BLOG') {
      return NextResponse.json({ error: 'Type must be BLOG' }, { status: 400 })
    }

    const textsRepository = TextsRepository.getInstance()

    // Prepare data for creation
    // Ensure dataIn has date field
    const dataInWithDate = dataIn 
      ? { ...dataIn, date: dataIn.date || new Date().toISOString() }
      : { slug: '', date: new Date().toISOString(), author: 'Altrp', readTime: 0 }

    const textData: any = {
      title,
      type: 'BLOG',
      statusName: statusName || 'DRAFT',
      category: category || null,
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      content: content || null,
      dataIn: dataInWithDate,
    }

    const createdText = await textsRepository.create(textData)

    // Parse dataIn for response
    let parsedDataIn: altrpTextDataIn | null = null
    if (createdText.dataIn) {
      try {
        if (typeof createdText.dataIn === 'string') {
          parsedDataIn = JSON.parse(createdText.dataIn) as altrpTextDataIn
        } else {
          parsedDataIn = createdText.dataIn as altrpTextDataIn
        }
      } catch (error) {
        console.error('Failed to parse dataIn for created text', createdText.taid, error)
      }
    }

    return NextResponse.json({
      success: true,
      text: {
        ...createdText,
        dataIn: parsedDataIn,
      } as altrpText,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create blog post', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message,
    }, { status: 500 })
  }
}

export const GET = withAdminGuard(handleGet)
export const POST = withAdminGuard(handlePost)


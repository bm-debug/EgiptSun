import { NextRequest, NextResponse } from 'next/server'
import { ChatRequest, ChatResponse } from '@/shared/types/shared'
import { getSession } from '@/shared/session'
import { buildRequestEnv } from '@/shared/env'
import { MeRepository } from '@/shared/repositories/me.repository'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { MessagesRepository } from '@/shared/repositories/messages.repository'
import { AIRepository } from '@/shared/repositories/ai-repository'

export async function POST(request: NextRequest) {
  try {
    const env = buildRequestEnv()

    if (!env.AUTH_SECRET) {
      return NextResponse.json(
        { error: 'Authentication not configured' },
        { status: 500 }
      )
    }

    const sessionUser = await getSession(request, env.AUTH_SECRET)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const meRepository = MeRepository.getInstance()
    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUser.id), {
      includeHuman: true,
    })

    if (!userWithRoles?.human) {
      return NextResponse.json(
        { error: 'User or human data not found' },
        { status: 404 }
      )
    }

    const haid = userWithRoles.human.haid

    const body = (await request.json()) as ChatRequest
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!env.AI_API_URL || !env.AI_API_TOKEN) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    const threadRepo = MessageThreadsRepository.getInstance()
    const messagesRepo = MessagesRepository.getInstance()

    const thread = await threadRepo.findOrCreateByHaid(haid, 'ai_chat')
    const threadSettings = threadRepo.getThreadSettings(thread)

    const recentMessages = await messagesRepo.getRecentMessages(
      thread.maid,
      threadSettings.context_length
    )

    const threadDataIn =
      typeof thread.dataIn === 'string' ? JSON.parse(thread.dataIn) : thread.dataIn || {}
    const summary = threadDataIn.summary

    const aiRepository = new AIRepository({
      env: {
        AI_API_URL: env.AI_API_URL,
        AI_API_TOKEN: env.AI_API_TOKEN,
        BOT_TOKEN: env.BOT_TOKEN,
        TRANSCRIPTION_MODEL: env.TRANSCRIPTION_MODEL,
      },
    })

    await messagesRepo.createUserMessage(thread.maid, message)

    const aiResponse = await aiRepository.getAIResponse(
      recentMessages,
      message,
      threadSettings.prompt,
      threadSettings.model,
      summary
    )

    await messagesRepo.createAIMessage(thread.maid, aiResponse)

    const response: ChatResponse = { response: aiResponse }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

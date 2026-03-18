import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/shared/session'
import { buildRequestEnv } from '@/shared/env'
import { MeRepository } from '@/shared/repositories/me.repository'
import { MessageThreadsRepository } from '@/shared/repositories/message-threads.repository'
import { MessagesRepository } from '@/shared/repositories/messages.repository'
import { parseJson } from '@/shared/repositories/utils'

interface ChatHistoryMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function GET(_request: NextRequest) {
  try {
    const env = buildRequestEnv()

    if (!env.AUTH_SECRET) {
      return NextResponse.json(
        { error: 'Authentication not configured' },
        { status: 500 }
      )
    }

    const sessionUser = await getSession(_request, env.AUTH_SECRET)
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

    const threadRepo = MessageThreadsRepository.getInstance()
    const messagesRepo = MessagesRepository.getInstance()

    const thread = await threadRepo.findOrCreateByHaid(haid, 'ai_chat')
    const dbMessages = await messagesRepo.getAllMessagesByMaid(thread.maid)

    const historyMessages: ChatHistoryMessage[] = dbMessages.map((msg) => {
      const dataIn = parseJson<{
        direction?: 'incoming' | 'outgoing'
        isAIResponse?: boolean
      }>(msg.data_in, {})
      const direction = dataIn.direction ?? 'incoming'
      const isAIResponse = dataIn.isAIResponse ?? false
      const role: 'user' | 'assistant' =
        isAIResponse || direction === 'outgoing' ? 'assistant' : 'user'

      return {
        id: msg.full_maid ?? `msg-${Date.now()}-${Math.random()}`,
        role,
        content: msg.title ?? '',
        timestamp: msg.created_at,
      }
    })

    return NextResponse.json({ messages: historyMessages })
  } catch (error) {
    console.error('Chat history error:', error)
    return NextResponse.json(
      {
        error: 'Failed to load chat history',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

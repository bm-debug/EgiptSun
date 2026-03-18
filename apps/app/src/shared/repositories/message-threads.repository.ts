import BaseRepository from './BaseRepositroy'
import { schema } from '../schema'
import type { MessageThread, NewMessage, NewMessageThread } from '../schema/types'
import { generateAid } from '../generate-aid'
import { altrpHuman } from '../types/altrp'
import { DbFilters, DbOrders, DbPagination, DbPaginatedResult } from '../types/shared'
import { 
  altrpSupportChat, 
  altrpSupportMessage, 
  altrpSupportMessageDataIn,
  altrpSupportMessageType,
  NewaltrpSupportMessage,
  altrpSupportChatDataIn,
  } from '../types/altrp-support'
import { MessagesRepository } from './messages.repository'
import { UsersRepository } from './users.repository'
import { parseJson } from './utils'
import { sql, and, eq, isNull, inArray } from 'drizzle-orm'
import { logUserJournalEvent } from '../services/user-journal.service'
import type { Env } from '../types'
import { buildRequestEnv } from '../env'
import { sendToRoom, sendToUser } from '@/packages/lib/socket'

export class MessageThreadsRepository extends BaseRepository<MessageThread> {
  constructor() {
    super(schema.messageThreads)
  }

  public static getInstance(): MessageThreadsRepository {
    return new MessageThreadsRepository()
  }

  /**
   * Find or create a chat thread for a user (AI chat).
   */
  async findOrCreateByHaid(haid: string, type: string = 'ai_chat'): Promise<MessageThread> {
    const existing = await this.db
      .select()
      .from(this.schema)
      .where(
        and(
          eq(this.schema.xaid, haid),
          eq(this.schema.type, type),
          isNull(this.schema.deletedAt)
        )
      )
      .limit(1)
      .execute()

    if (existing.length > 0) {
      return existing[0] as MessageThread
    }

    const newThread = await this.create({
      maid: generateAid('m'),
      xaid: haid,
      type,
      title: 'AI Chat',
      statusName: 'active',
      dataIn: {
        prompt: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.',
        model: 'gemini-2.5-flash',
        context_length: 6,
      },
    } as Partial<NewMessageThread>)
    return newThread as MessageThread
  }

  /**
   * Get thread settings (prompt, model, context_length) from dataIn.
   */
  getThreadSettings(thread: MessageThread): {
    prompt: string
    model: string
    context_length: number
  } {
    const defaultSettings = {
      prompt: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.',
      model: 'gemini-2.5-flash',
      context_length: 6,
    }
    if (!thread.dataIn) return defaultSettings
    const dataIn = parseJson<{ prompt?: string; model?: string; context_length?: number }>(thread.dataIn, {})
    return {
      prompt: dataIn.prompt ?? defaultSettings.prompt,
      model: dataIn.model ?? defaultSettings.model,
      context_length: dataIn.context_length ?? defaultSettings.context_length,
    }
  }

  public async findByMaid(maid: string): Promise<MessageThread | null> {
    const [row] = await this.db
      .select()
      .from(this.schema)
      .where(eq(this.schema.maid, maid))
      .limit(1)
      .execute()
    return (row as MessageThread) || null
  }
  public async beforeCreate(data: Partial<NewMessageThread>): Promise<void> {
    if (!data.uuid) {
      data.uuid = crypto.randomUUID()
    }
    if (!data.maid) {
      data.maid = generateAid('m')
    }
    if(! data.dataIn) {
        data.dataIn = {}
    }
  }
  /**
   * startNewSupportChat
   */
  public async startNewSupportChat(humanHaid: altrpHuman['haid'], subject: string, env?: Env) {
    if(!humanHaid) {
      throw new Error('Human haid is required to start new support chat')
    }
    if(!subject) {
      throw new Error('Subject is required to start new support chat')
    }
    const chat = await this.create({
      title: subject,
      maid: generateAid('m'),
      statusName: 'OPEN',
      type: 'SUPPORT',
      dataIn: {
        humanHaid: humanHaid,
      },
    }) as altrpSupportChat
    env = env ?? buildRequestEnv()
    await sendToRoom('admin', 'update-admin', {
      type: 'support-chat-created',
    })
    // Log to journal if env is provided
    if (env) {
      try {
        // Find user by humanAid using UsersRepository
        const usersRepository = UsersRepository.getInstance()
        const user = await usersRepository.findByHumanAid(humanHaid)

        if (user) {
          await logUserJournalEvent(
            env,
            'USER_JOURNAL_SUPPORT_CHAT_CREATED',
            {
              id: user.id,
              uuid: user.uuid,
              email: user.email,
              humanAid: user.humanAid,
              dataIn: user.dataIn as any,
            },
            {
              chat: {
                uuid: chat.uuid,
                maid: chat.maid,
                title: chat.title,
                statusName: chat.statusName,
              },
            }
          )
        }
      } catch (journalError) {
        console.error('Failed to log support chat creation event', journalError)
        // Don't fail chat creation if journal logging fails
      }
    }

    return chat
  }
  /**
   * getFilteredSupportChats
   */
  public async getFilteredSupportChats( filters: DbFilters, orders: DbOrders, pagination: DbPagination ): Promise<DbPaginatedResult<altrpSupportChat>> {
    filters.conditions = filters.conditions ?? []
    
    // Extract managerHaid filter if present
    const managerHaidIndex = filters.conditions.findIndex(
      c => c.field === 'managerHaid' && c.operator === 'eq'
    )
    let managerHaid: string | undefined
    if (managerHaidIndex >= 0) {
      managerHaid = filters.conditions[managerHaidIndex].values?.[0] as string | undefined
      filters.conditions.splice(managerHaidIndex, 1) // Remove from conditions
    }
    
    // Extract humanHaid filter if present
    const humanHaidIndex = filters.conditions.findIndex(
      c => c.field === 'humanHaid' && c.operator === 'eq'
    )
    let humanHaid: string | undefined
    if (humanHaidIndex >= 0) {
      humanHaid = filters.conditions[humanHaidIndex].values?.[0] as string | undefined
      filters.conditions.splice(humanHaidIndex, 1) // Remove from conditions
    }
    
    // Add type filter
    filters.conditions.push({
      field: 'type',
      operator: 'eq',
      values: ['SUPPORT'],
    })
    
    // Build base query
    const query = this.getSelectQuery()
    const baseWhere = this.buildWhereFromFilters(filters)
    
    // Build conditions array
    const conditions: any[] = []
    
    // Add base filters
    if (baseWhere) {
      conditions.push(baseWhere)
    }
    
    // Add managerHaid filter using JSONB if needed
    if (managerHaid) {
      conditions.push(sql`${this.schema.dataIn}::jsonb->>'managerHaid' = ${managerHaid}`)
    }
    
    // Add humanHaid filter using JSONB if needed
    if (humanHaid) {
      conditions.push(sql`${this.schema.dataIn}::jsonb->>'humanHaid' = ${humanHaid}`)
    }
    
    // Add soft delete filter
    conditions.push(sql`${this.schema.deletedAt} IS NULL`)
    
    // Combine all conditions
    const where = conditions.length > 0 ? and(...conditions) : undefined
    
    // Build orders
    const order = this.buildOrders(orders)
    
    // Pagination
    const limit = Math.max(1, Math.min(pagination.limit ?? 10, 100))
    const page = Math.max(1, pagination.page ?? 1)
    const offset = (page - 1) * limit
    
    // Get total count
    const countQuery = this.getSelectQuery()
    const totalRows = await countQuery.where(where).execute()
    const total = totalRows.length
    
    // Get results
    const resultQuery = query.where(where).orderBy(...order).limit(limit).offset(offset)
    const result = await resultQuery.execute() as altrpSupportChat[]
    
    return {
      docs: result,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }
  
  private buildWhereFromFilters(filters: DbFilters) {
    const { buildDbFilters } = require('./utils')
    return buildDbFilters(this.schema, filters) || undefined
  }
  
  private buildOrders(orders: DbOrders) {
    const { buildDbOrders } = require('./utils')
    return buildDbOrders(this.schema, orders)
  }

  public async addMessageToSupportChat( chatMaid: MessageThread['maid'], content: string, messageType: altrpSupportMessageType, humanHaid: altrpHuman['haid'], senderRole: 'client' | 'admin', mediaUuid?: string ): Promise<altrpSupportMessage> {
    if(!humanHaid) {
      throw new Error('Human haid is required to add message to support chat')
    }
    if(!content) {
      throw new Error('Content is required to add message to support chat')
    }
    if(!messageType) {
      throw new Error('Message type is required to add message to support chat')
    }
    const messageRepository = MessagesRepository.getInstance()
    const messageData: Partial<NewaltrpSupportMessage> = {
      maid: chatMaid,
      dataIn: {
        content: content,
        messageType: messageType,
        humanHaid: humanHaid,
        sender_role: senderRole,
        ...(mediaUuid && { mediaUuid }),
      },
    }
    try {
      await sendToRoom(`chat:${chatMaid}`, 'new-message', {
      })
      await sendToRoom('admin', 'update-admin', {
        type: 'admin-updated-notices',
      })
      await sendToRoom('admin', 'update-admin', {
        type: 'admin-updated-support',
      })
      
      // If admin sent a message, notify the client
      if (senderRole === 'admin') {
        // Get client's humanHaid from chat
        const chat = await this.findByMaid(chatMaid)
        if (chat) {
          let chatDataIn: altrpSupportChatDataIn | null = null
          if (chat.dataIn) {
            try {
              chatDataIn = typeof chat.dataIn === 'string'
                ? JSON.parse(chat.dataIn) as altrpSupportChatDataIn
                : chat.dataIn as altrpSupportChatDataIn
            } catch (error) {
              console.error('Failed to parse chat dataIn', error)
            }
          }
          
          const clientHaid = chatDataIn?.humanHaid
          if (clientHaid) {
            await sendToUser(clientHaid, 'update-client', {
              type: 'client-updated-notices',
            })
            await sendToUser(clientHaid, 'update-client', {
              type: 'client-updated-support',
            })
          }
        }
      } else {
      }
    } catch (socketError) {
      console.error('Failed to send socket events:', socketError)
      // Don't fail update if socket notification fails
    }
    return await messageRepository.create(messageData) as altrpSupportMessage
  }

  public async addMessageToTaskThread(
    taskMaid: MessageThread['maid'],
    content: string,
    messageType: Exclude<altrpSupportMessageType, 'voice' | 'document'>,
    humanHaid: altrpHuman['haid'],
    mediaUuid?: string,
    mediaUrl?: string
  ): Promise<altrpSupportMessage> {
    if (!humanHaid) {
      throw new Error('Human haid is required to add message to task')
    }
    if (!content) {
      throw new Error('Content is required to add message to task')
    }
    const messageRepository = MessagesRepository.getInstance()
    const messageData: Partial<NewaltrpSupportMessage> = {
      maid: taskMaid,
      dataIn: {
        content,
        messageType,
        humanHaid,
        sender_role: 'admin',
        ...(mediaUuid && { mediaUuid }),
        ...(mediaUrl && { mediaUrl }),
      },
    }

    try {
      await sendToRoom(`task:${taskMaid}`, 'new-message', {})
    } catch (socketError) {
      console.error('Failed to send task socket events:', socketError)
    }

    return (await messageRepository.create(messageData)) as altrpSupportMessage
  }

  public async updateChatStatus(maid: MessageThread['maid'], status: 'OPEN' | 'CLOSED'): Promise<altrpSupportChat> {
    const chat = await this.findByMaid(maid);
    if (!chat) {
      throw new Error('Chat not found');
    }
    if (chat.type !== 'SUPPORT') {
      throw new Error('Chat is not a support chat');
    }
    const updatedChat = await this.update(chat.uuid, { statusName: status, updatedAt: new Date() });
    return updatedChat as altrpSupportChat;
  }

  public async assignManager(maid: MessageThread['maid'], managerHaid: altrpHuman['haid'] | null): Promise<altrpSupportChat> {
    const chat = await this.findByMaid(maid);
    if (!chat) {
      throw new Error('Chat not found');
    }
    if (chat.type !== 'SUPPORT') {
      throw new Error('Chat is not a support chat');
    }

    // Parse existing dataIn
    let dataIn: Partial<altrpSupportChatDataIn> = {}
    if (chat.dataIn) {
      try {
        const parsed = typeof chat.dataIn === 'string' 
          ? JSON.parse(chat.dataIn) as altrpSupportChatDataIn
          : chat.dataIn as altrpSupportChatDataIn
        dataIn = { ...parsed }
      } catch (error) {
        console.error('Failed to parse chat dataIn', error)
      }
    }

    // Ensure humanHaid is present (required field)
    if (!dataIn.humanHaid) {
      throw new Error('Chat dataIn must contain humanHaid')
    }

    // Update managerHaid
    if (managerHaid) {
      dataIn.managerHaid = managerHaid
    } else {
      delete dataIn.managerHaid
    }

    // Cast to full type (we've ensured humanHaid is present)
    const fullDataIn: altrpSupportChatDataIn = dataIn as altrpSupportChatDataIn

    // Update chat with new dataIn
    const updatedChat = await this.update(chat.uuid, { 
      dataIn: fullDataIn as any,
      updatedAt: new Date() 
    });
    return updatedChat as altrpSupportChat;
  }

  /**
   * Count support chats with unread messages from clients (for admin)
   * Returns the number of unique chats that have at least one unread message from a client
   */
  public async countChatsWithUnreadClientMessages(): Promise<number> {
    const messagesRepository = MessagesRepository.getInstance()
    
    // Get all messages from clients that are not read by admin
    const unreadMessages = await this.db
      .select({ maid: schema.messages.maid })
      .from(schema.messages)
      .where(
        and(
          isNull(schema.messages.deletedAt),
          sql`COALESCE(${schema.messages.dataIn}::jsonb->>'sender_role', '') = 'client'`,
          sql`COALESCE(${schema.messages.dataIn}::jsonb->>'admin_viewed_at', '') = ''`
        )
      )
      .execute()

    // Get unique chat maids with unread messages
    const unreadChatMaids = new Set<string>()
    for (const message of unreadMessages) {
      if (message.maid) {
        unreadChatMaids.add(message.maid)
      }
    }

    if (unreadChatMaids.size === 0) {
      return 0
    }

    // Count support chats that have unread messages
    const unreadChatMaidsArray = Array.from(unreadChatMaids)
    const supportChatsWithUnread = await this.db
      .select({ count: sql<number>`count(distinct ${this.schema.maid})` })
      .from(this.schema)
      .where(
        and(
          eq(this.schema.type, 'SUPPORT'),
          isNull(this.schema.deletedAt),
          inArray(this.schema.maid, unreadChatMaidsArray)
        )
      )
      .execute()

    return Number(supportChatsWithUnread[0]?.count || 0)
  }

  /**
   * Count support chats with unread messages from admin (for client)
   * Returns the number of unique chats that have at least one unread message from an admin
   * @param clientHaid - The client's human haid to filter chats by
   */
  public async countChatsWithUnreadAdminMessages(clientHaid: string): Promise<number> {
    // Get all messages from admins that are not read by client
    const unreadMessages = await this.db
      .select({ maid: schema.messages.maid })
      .from(schema.messages)
      .where(
        and(
          isNull(schema.messages.deletedAt),
          sql`COALESCE(${schema.messages.dataIn}::jsonb->>'sender_role', '') = 'admin'`,
          sql`COALESCE(${schema.messages.dataIn}::jsonb->>'client_viewed_at', '') = ''`
        )
      )
      .execute()

    // Get unique chat maids with unread messages
    const unreadChatMaids = new Set<string>()
    for (const message of unreadMessages) {
      if (message.maid) {
        unreadChatMaids.add(message.maid)
      }
    }

    if (unreadChatMaids.size === 0) {
      return 0
    }

    // Count support chats that have unread messages and belong to the client
    const unreadChatMaidsArray = Array.from(unreadChatMaids)
    const supportChatsWithUnread = await this.db
      .select({ count: sql<number>`count(distinct ${this.schema.maid})` })
      .from(this.schema)
      .where(
        and(
          eq(this.schema.type, 'SUPPORT'),
          isNull(this.schema.deletedAt),
          inArray(this.schema.maid, unreadChatMaidsArray),
          sql`${this.schema.dataIn}::jsonb->>'humanHaid' = ${clientHaid}`
        )
      )
      .execute()

    return Number(supportChatsWithUnread[0]?.count || 0)
  }
}


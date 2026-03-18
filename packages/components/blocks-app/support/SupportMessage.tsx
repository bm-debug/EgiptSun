'use client'

import * as React from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useRoomSocket } from '@/hooks/use-user-socket'
import { useMe } from '@/providers/MeProvider'
import type { altrpSupportMessage, altrpSupportChat } from '@/shared/types/altrp-support'

interface SupportMessageProps {
  message: altrpSupportMessage
  chat: altrpSupportChat
  formatDate: (dateString: string | Date | null | undefined) => string
  isClientView?: boolean
  humanDisplayName?: string | null
  humanHaid?: string | null
  userUuid?: string | null
  onViewStatusUpdate?: (messageUuid: string, viewStatus: { client_viewed_at?: string | null; admin_viewed_at?: string | null }) => void
}

export function SupportMessage({
  message,
  chat,
  formatDate,
  isClientView = false,
  humanDisplayName,
  userUuid,
  humanHaid,
  onViewStatusUpdate,
}: SupportMessageProps) {
  const { user: meUser } = useMe()
  const messageDataIn = message.dataIn as any
  const isPhoto = messageDataIn?.messageType === 'photo'
  const content = messageDataIn?.content || ''
  const mediaUuid = messageDataIn?.mediaUuid
  const [viewStatus, setViewStatus] = React.useState<{
    client_viewed_at?: string | null
    admin_viewed_at?: string | null
  }>({
    client_viewed_at: messageDataIn?.client_viewed_at || null,
    admin_viewed_at: messageDataIn?.admin_viewed_at || null,
  })

  // Check if message is from current user
  const currentUserHaid = meUser?.humanAid
  const isFromCurrentUser = currentUserHaid && messageDataIn?.humanHaid === currentUserHaid
  const isUnread = isFromCurrentUser && (
    (isClientView && !viewStatus.admin_viewed_at) ||
    (!isClientView && !viewStatus.client_viewed_at)
  )

  // Track if we've already fetched view status for this message to avoid infinite loops
  const fetchedMessageUuidRef = React.useRef<string | null>(null)

  // Reset fetched flag when message changes
  React.useEffect(() => {
    if (fetchedMessageUuidRef.current !== message.uuid) {
      fetchedMessageUuidRef.current = null
    }
  }, [message.uuid])

  // Fetch view status when component mounts if message is from current user
  React.useEffect(() => {
    if (!currentUserHaid || !isFromCurrentUser || !onViewStatusUpdate) return
    if (fetchedMessageUuidRef.current === message.uuid) return

    const fetchViewStatus = async () => {
      try {
        const apiPath = isClientView
          ? `/api/altrp/v1/c/messages/${message.uuid}/view-status`
          : `/api/altrp/v1/admin/messages/${message.uuid}/view-status`

        const response = await fetch(apiPath, {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json() as { success?: boolean; data?: { client_viewed_at?: string | null; admin_viewed_at?: string | null } }
          if (data.success && data.data) {
            setViewStatus(data.data)
            if (onViewStatusUpdate) {
              onViewStatusUpdate(message.uuid, data.data)
            }
            fetchedMessageUuidRef.current = message.uuid
          }
        }
      } catch (error) {
        console.error('Failed to fetch view status', error)
      }
    }

    fetchViewStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.uuid, currentUserHaid, isFromCurrentUser, isClientView])

  // Subscribe to viewed-message event if message is unread and from current user
  useRoomSocket(
    isUnread && isFromCurrentUser ? `message:${message.uuid}` : '',
    {
      'viewed-message': async () => {
        // Fetch updated view status
        try {
          const apiPath = isClientView
            ? `/api/altrp/v1/c/messages/${message.uuid}/view-status`
            : `/api/altrp/v1/admin/messages/${message.uuid}/view-status`

          const response = await fetch(apiPath, {
            credentials: 'include',
          })

          if (response.ok) {
            const data = await response.json() as { success?: boolean; data?: { client_viewed_at?: string | null; admin_viewed_at?: string | null } }
            if (data.success && data.data) {
              setViewStatus(data.data)
              if (onViewStatusUpdate) {
                onViewStatusUpdate(message.uuid, data.data)
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch view status after event', error)
        }
      },
    }
  )

  if (isClientView) {
    const isFromMe = messageDataIn?.sender_role === 'client' || messageDataIn?.humanHaid === chat.dataIn.humanHaid
    const isReadByAdmin = isFromMe && viewStatus.admin_viewed_at

    return (
      <div
        className={`flex flex-col gap-2 p-4 rounded-lg ${
          !isFromMe ? 'bg-primary/10' : 'bg-muted/50'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {isFromMe ? 'Вы' : 'Поддержка'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(message.createdAt)}
            </span>
          </div>
        </div>
        {isPhoto && mediaUuid ? (
          <div className="space-y-2">
            <img
              src={`/api/altrp/v1/c/files/${mediaUuid}`}
              alt="Photo"
              className="max-w-md rounded-lg"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            {content && <p className="text-sm">{content}</p>}
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        )}
        {isFromMe && isReadByAdmin && (
          <div className="flex justify-start mt-1">
            <Check className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
    )
  }

  // Admin view
  const isFromAdmin = messageDataIn?.sender_role === 'admin'
  const isReadByClient = isFromAdmin && viewStatus.client_viewed_at

  return (
    <div
      className={`flex flex-col gap-2 p-4 rounded-lg ${
        isFromAdmin ? 'bg-primary/10' : 'bg-muted/50'
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isFromAdmin ? (
              'Администратор'
            ) : (
              <>
                Клиент
                {humanDisplayName && userUuid ? (
                  <Link
                    href={`/admin/users/${userUuid}`}
                    className="text-primary hover:underline ml-1">
                    {humanDisplayName}
                  </Link>
                ) : humanDisplayName ? (
                  `: ${humanDisplayName}`
                ) : null}
              </>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(message.createdAt)}
          </span>
        </div>
      </div>
      {isPhoto && mediaUuid ? (
        <div className="space-y-2">
          <img
            src={`/api/altrp/v1/admin/files/${mediaUuid}`}
            alt="Photo"
            className="max-w-md rounded-lg"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          {content && <p className="text-sm">{content}</p>}
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      )}
      {isFromAdmin && isReadByClient && (
        <div className="flex justify-start mt-1">
          <Check className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}


'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Send, Image as ImageIcon, X, Lock } from 'lucide-react'
import type { altrpSupportChat, altrpSupportMessage } from '@/shared/types/altrp-support'
import { Input } from '@/components/ui/input'
import { useConsumerHeader } from '@/components/blocks-app/cabinet/ConsumerHeaderContext'
import { useRoomSocket } from '@/hooks/use-user-socket'
import { SupportMessage } from '@/components/blocks-app/support/SupportMessage'
import Link from 'next/link'

interface ChatDetail {
  chat: altrpSupportChat
  messages: altrpSupportMessage[]
}

export default function SupportChatPageClient() {
  const params = useParams()
  const router = useRouter()
  const maid = params.maid as string
  const { setTitle, setBreadcrumbItems } = useConsumerHeader()
  const [chat, setChat] = React.useState<altrpSupportChat | null>(null)
  const [messages, setMessages] = React.useState<altrpSupportMessage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sending, setSending] = React.useState(false)
  const [messageContent, setMessageContent] = React.useState('')
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [filePreview, setFilePreview] = React.useState<string | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(true)
  const [closing, setClosing] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)
  const messageInputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (!loading) {
      messageInputRef.current?.focus()
    }
  }, [loading])
  

  // Fetch chat info
  React.useEffect(() => {
    const fetchChat = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/altrp/v1/c/support/${maid}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          const data = await response.json() as { error?: string; message?: string }
          throw new Error(data.message || data.error || 'Failed to load chat')
        }

        const data = await response.json() as { success?: boolean; data?: ChatDetail }
        if (data.data) {
          const chatData = data.data.chat
          setChat(chatData)
          
          // Update breadcrumbs with chat title
          setTitle(chatData.title || 'Обращение в поддержку')
          setBreadcrumbItems([
            { label: 'Кабинет Потребителя', href: '/c/dashboard' },
            { label: 'Поддержка', href: '/c/support' },
            { label: chatData.title || 'Обращение в поддержку' },
          ])
        }
      } catch (err) {
        console.error('Chat fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load chat')
      } finally {
        setLoading(false)
      }
    }

    if (maid) {
      fetchChat()
    }
  }, [maid])

  // Fetch messages with pagination
  const fetchMessages = React.useCallback(async (page: number, append: boolean = false) => {
    try {
      setLoadingMessages(true)
      const response = await fetch(`/api/altrp/v1/c/support/${maid}/messages?page=${page}&limit=20`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      const data = await response.json() as { success?: boolean; data?: { messages: altrpSupportMessage[], pagination: { hasMore: boolean } } }
      if (data.data) {
        // Messages come sorted by createdAt desc (newest first), but we need to reverse for display
        const reversedMessages = [...data.data.messages].reverse()
        if (append) {
          // When appending (loading older messages), add to the beginning
          setMessages((prev) => [...reversedMessages, ...prev])
        } else {
          // When loading initial page, set messages (newest at bottom)
          setMessages(reversedMessages)
        }
        setHasMore(data.data.pagination.hasMore)
        setCurrentPage(page)
      }
    } catch (err) {
      console.error('Messages fetch error:', err)
    } finally {
      setLoadingMessages(false)
    }
  }, [maid])

  // Load initial messages
  React.useEffect(() => {
    if (chat && messages.length === 0) {
      fetchMessages(1, false)
    }
  }, [chat, fetchMessages, messages.length])

  // Handle scroll for lazy loading
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const Container = e.currentTarget
    if (Container.scrollTop === 0 && hasMore && !loadingMessages) {
      fetchMessages(currentPage + 1, true)
    }
  }, [hasMore, loadingMessages, currentPage, fetchMessages])

  React.useEffect(() => {
    // Scroll to bottom when new messages are added (not from pagination)
    if (messages.length > 0 && !loadingMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, loadingMessages])

  // Ref to track latest message timestamp
  const latestMessageTimestampRef = React.useRef<string | null>(null)
  const [isPageActive, setIsPageActive] = React.useState<boolean>(true)
  const pageActiveRef = React.useRef<boolean>(true)
  const markRequestInFlightRef = React.useRef<boolean>(false)

  // Track tab/visibility state to avoid sending view requests when page is inactive
  React.useEffect(() => {
    const updateActivity = () => {
      const active = document.visibilityState === 'visible' && document.hasFocus()
      setIsPageActive(active)
      pageActiveRef.current = active
    }

    updateActivity()

    document.addEventListener('visibilitychange', updateActivity)
    window.addEventListener('focus', updateActivity)
    window.addEventListener('blur', updateActivity)

    return () => {
      document.removeEventListener('visibilitychange', updateActivity)
      window.removeEventListener('focus', updateActivity)
      window.removeEventListener('blur', updateActivity)
    }
  }, [])

  // Update ref when messages change
  React.useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1]
      if (latestMessage?.createdAt) {
        latestMessageTimestampRef.current = latestMessage.createdAt instanceof Date
          ? latestMessage.createdAt.toISOString()
          : String(latestMessage.createdAt)
      }
    }
  }, [messages])

  // Mark admin messages as viewed when page is active
  const markAdminMessagesViewed = React.useCallback(async () => {
    if (!maid) return
    if (!pageActiveRef.current) return

    const hasUnviewedAdminMessages = messages.some(
      (msg) => msg.dataIn?.sender_role === 'admin' && !msg.dataIn?.client_viewed_at
    )

    if (!hasUnviewedAdminMessages) return
    if (markRequestInFlightRef.current) return

    markRequestInFlightRef.current = true
    try {
      await fetch(`/api/altrp/v1/c/support/${maid}/messages/view`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Failed to mark admin messages as viewed', error)
    } finally {
      markRequestInFlightRef.current = false
    }
  }, [maid, messages])

  React.useEffect(() => {
    if (isPageActive) {
      void markAdminMessagesViewed()
    }
  }, [isPageActive, messages, markAdminMessagesViewed])

  // Fetch new messages function
  const fetchNewMessages = React.useCallback(async () => {
    const afterTimestamp = latestMessageTimestampRef.current
    if (!afterTimestamp) return

    try {
      const response = await fetch(
        `/api/altrp/v1/c/support/${maid}/messages/new?after=${encodeURIComponent(afterTimestamp)}`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        console.error('Failed to fetch new messages')
        return
      }

      const data = await response.json() as { success?: boolean; data?: { messages: altrpSupportMessage[] } }
      if (data.success && data.data?.messages && data.data.messages.length > 0) {
        // Reverse messages to maintain order (newest at bottom)
        const reversedNewMessages = [...data.data.messages].reverse()
        setMessages((prev) => {
          // Check if messages already exist to avoid duplicates
          const existingUuids = new Set(prev.map((m) => m.uuid))
          const uniqueNewMessages = reversedNewMessages.filter((m) => !existingUuids.has(m.uuid))
          if (uniqueNewMessages.length > 0) {
            // Scroll to bottom after adding new messages
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
            return [...prev, ...uniqueNewMessages]
          }
          return prev
        })
      }
    } catch (error) {
      console.error('Failed to fetch new messages:', error)
    }
  }, [maid])

  // Subscribe to socket events for new messages
  useRoomSocket(
    maid ? `chat:${maid}` : '',
    {
      'new-message': () => {
        // When new message event is received, fetch new messages
        fetchNewMessages()
      },
    }
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedMimeTypes.includes(file.type)) {
        setError('Разрешены только изображения (JPG, PNG, WebP)')
        return
      }

      setSelectedFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    // Check if clipboard contains image
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault() // Prevent default paste behavior
        
        const file = item.getAsFile()
        if (!file) return

        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowedMimeTypes.includes(file.type)) {
          setError('Разрешены только изображения (JPG, PNG, WebP)')
          return
        }

        // Set file and preview
        setSelectedFile(file)
        
        const reader = new FileReader()
        reader.onloadend = () => {
          setFilePreview(reader.result as string)
          // Auto-send the image
          handleSendImageMessage(file)
        }
        reader.readAsDataURL(file)
        
        return
      }
    }
    // If no image found, allow default paste behavior for text
  }

  const handleSendImageMessage = async (file: File) => {
    if (!file || sending) return

    try {
      setSending(true)
      setError(null)

      const formData = new FormData()
      formData.append('chatMaid', maid)
      if (messageContent.trim()) {
        formData.append('content', messageContent.trim())
      }
      formData.append('file', file)
      formData.append('messageType', 'photo')

      const response = await fetch('/api/altrp/v1/c/support/messages', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string; message?: string }
        throw new Error(data.message || data.error || 'Failed to send message')
      }

      // Clear form
      setMessageContent('')
      setSelectedFile(null)
      setFilePreview(null)

      // Reload messages (only latest page to get new message)
      await fetchMessages(1, false)
    } catch (err) {
      console.error('Send image message error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send image')
      // Keep the file and preview so user can retry
    } finally {
      setSending(false)
      // Focus after sending is finished and input is enabled
      setTimeout(() => {
        messageInputRef.current?.focus()
      }, 0)
    }
  }

  const sendMessage = React.useCallback(async () => {
    if (!messageContent.trim() && !selectedFile) {
      setError('Введите сообщение или выберите фото')
      return
    }

    try {
      setSending(true)
      setError(null)

      const formData = new FormData()
      formData.append('chatMaid', maid)
      if (messageContent.trim()) {
        formData.append('content', messageContent.trim())
      }
      if (selectedFile) {
        formData.append('file', selectedFile)
        formData.append('messageType', 'photo')
      } else {
        formData.append('messageType', 'text')
      }

      const response = await fetch('/api/altrp/v1/c/support/messages', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string; message?: string }
        throw new Error(data.message || data.error || 'Failed to send message')
      }

      // Clear form
      setMessageContent('')
      setSelectedFile(null)
      setFilePreview(null)

      // Reload messages (only latest page to get new message)
      await fetchMessages(1, false)
    } catch (err) {
      console.error('Send message error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
      // Focus after sending is finished and input is enabled
      setTimeout(() => {
        messageInputRef.current?.focus()
      }, 0)
    }
  }, [maid, messageContent, selectedFile, fetchMessages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
      e.preventDefault()
      if (!sending && (messageContent.trim() || selectedFile)) {
        void sendMessage()
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendMessage()
  }

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return ''
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const getStatusLabel = (statusName: string | null | undefined) => {
    switch (statusName) {
      case 'OPEN':
        return 'Открыт'
      case 'CLOSED':
        return 'Закрыт'
      default:
        return statusName || 'Неизвестно'
    }
  }

  const getStatusVariant = (statusName: string | null | undefined) => {
    switch (statusName) {
      case 'OPEN':
        return 'default'
      case 'CLOSED':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const handleCloseChat = async () => {
    if (!chat || chat.statusName === 'CLOSED') return

    try {
      setClosing(true)
      setError(null)

      const response = await fetch(`/api/altrp/v1/c/support/${maid}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ statusName: 'CLOSED' }),
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string; message?: string }
        throw new Error(data.message || data.error || 'Failed to close chat')
      }

      // Update chat status
      setChat((prev) => prev ? { ...prev, statusName: 'CLOSED' } : null)
    } catch (err) {
      console.error('Close chat error:', err)
      setError(err instanceof Error ? err.message : 'Failed to close chat')
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !chat) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => {
          if(window.history.length > 1) {
            router.back()
          } else {
            router.push('/c/support')
          }
        }}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!chat) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={
            () => {
              if(window.history.length > 1) {
                router.back()
              } else {
                router.push('/c/support')
              }
            }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{chat.title || 'Обращение в поддержку'}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={getStatusVariant(chat.statusName)}>
                {getStatusLabel(chat.statusName)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDate(chat.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Переписка</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="space-y-4 max-h-[600px] overflow-y-auto mb-4">
            {loadingMessages && hasMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {messages.length === 0 && !loadingMessages ? (
              <div className="text-center py-12 text-muted-foreground">
                Сообщений пока нет
              </div>
            ) : (
              messages.map((message) => (
                <SupportMessage
                  key={message.uuid}
                  message={message}
                  chat={chat}
                  formatDate={formatDate}
                  isClientView={true}
                  onViewStatusUpdate={(messageUuid, viewStatus) => {
                    setMessages((prev) =>
                      prev.map((msg) => {
                        if (msg.uuid === messageUuid) {
                          const updatedDataIn = {
                            ...(msg.dataIn as any),
                            ...viewStatus,
                          }
                          return { ...msg, dataIn: updatedDataIn }
                        }
                        return msg
                      })
                    )
                  }}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {filePreview && (
              <div className="relative inline-block">
                <img
                  src={filePreview}
                  alt="Preview"
                  className="max-w-xs rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите сообщение... (или вставьте изображение из буфера обмена)"
                  rows={3}
                  disabled={sending}
                  ref={messageInputRef}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                    disabled={sending}
                  />
                  <Label
                    htmlFor="file-input"
                    className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-sm">Фото</span>
                  </Label>
                </div>
              </div>
              <Button type="submit" disabled={sending || (!messageContent.trim() && !selectedFile)}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {chat.statusName === 'OPEN' && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleCloseChat}
            disabled={closing}>
            {closing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Закрытие...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Закрыть заявку
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}


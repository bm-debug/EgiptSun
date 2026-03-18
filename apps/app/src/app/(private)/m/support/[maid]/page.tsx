'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Send, Image as ImageIcon, X, Lock, LockOpen } from 'lucide-react'
import type { altrpSupportChat, altrpSupportMessage } from '@/shared/types/altrp-support'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import { useRoomSocket } from '@/hooks/use-user-socket'
import { SupportMessage } from '@/components/blocks-app/support/SupportMessage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ChatDetail {
  chat: altrpSupportChat
  messages: altrpSupportMessage[]
}

export default function AdminSupportChatPage() {
  const params = useParams()
  const router = useRouter()
  const maid = params.maid as string
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
  const [changingStatus, setChangingStatus] = React.useState(false)
  const [operators, setOperators] = React.useState<Array<{ uuid: string; humanAid: string | null; fullName: string | null }>>([])
  const [assigningManager, setAssigningManager] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)
  const messageInputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (!loading) {
      messageInputRef.current?.focus()
    }
  }, [loading])

  // Fetch operators
  React.useEffect(() => {
    const fetchOperators = async () => {
      try {
        const response = await fetch('/api/altrp/v1/admin/users/managers', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json() as { docs: Array<{ uuid: string; humanAid: string | null; fullName: string | null }> }
          setOperators(data.docs.map(op => ({
            uuid: op.uuid,
            humanAid: op.humanAid,
            fullName: op.fullName,
          })))
        }
      } catch (err) {
        console.error('Operators fetch error:', err)
      }
    }
    fetchOperators()
  }, [])

  // Fetch chat info
  React.useEffect(() => {
    const fetchChat = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/altrp/v1/admin/support/${maid}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          const data = await response.json() as { error?: string; message?: string }
          throw new Error(data.message || data.error || 'Failed to load chat')
        }

        const data = await response.json() as { success?: boolean; data?: ChatDetail }
        if (data.data) {
          setChat(data.data.chat)
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
      const response = await fetch(`/api/altrp/v1/admin/support/${maid}/messages?page=${page}&limit=20`, {
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

// Mark client messages as viewed when page is active
const markClientMessagesViewed = React.useCallback(async () => {
  if (!maid) return
  if (!pageActiveRef.current) return

  const hasUnviewedClientMessages = messages.some(
    (msg) => msg.dataIn?.sender_role === 'client' && !msg.dataIn?.admin_viewed_at
  )

  if (!hasUnviewedClientMessages) return
  if (markRequestInFlightRef.current) return

  markRequestInFlightRef.current = true
  try {
    await fetch(`/api/altrp/v1/admin/support/${maid}/messages/view`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.error('Failed to mark client messages as viewed', error)
  } finally {
    markRequestInFlightRef.current = false
  }
}, [maid, messages])

React.useEffect(() => {
  if (isPageActive) {
    void markClientMessagesViewed()
  }
}, [isPageActive, messages, markClientMessagesViewed])

  // Fetch new messages function
  const fetchNewMessages = React.useCallback(async () => {
    const afterTimestamp = latestMessageTimestampRef.current
    if (!afterTimestamp) return

    try {
      const response = await fetch(
        `/api/altrp/v1/admin/support/${maid}/messages/new?after=${encodeURIComponent(afterTimestamp)}`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        console.error('Failed to fetch new messages')
        return
      }

      const data = await response.json() as { success?: boolean; data?: { messages: any[] } }
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

      const response = await fetch('/api/altrp/v1/admin/support', {
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

  const handleChangeStatus = async (newStatus: 'OPEN' | 'CLOSED') => {
    if (!chat || chat.statusName === newStatus) return

    try {
      setChangingStatus(true)
      setError(null)

      const response = await fetch(`/api/altrp/v1/admin/support/${maid}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ statusName: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string; message?: string }
        throw new Error(data.message || data.error || 'Failed to update chat status')
      }

      // Update chat status
      setChat((prev) => prev ? { ...prev, statusName: newStatus } : null)
    } catch (err) {
      console.error('Change status error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update chat status')
    } finally {
      setChangingStatus(false)
    }
  }

  const handleAssignManager = async (managerHaid: string | null) => {
    if (!chat) return

    try {
      setAssigningManager(true)
      setError(null)

      const response = await fetch(`/api/altrp/v1/admin/support/${maid}/manager`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ managerHaid }),
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string; message?: string }
        throw new Error(data.message || data.error || 'Failed to assign manager')
      }

      const data = await response.json() as { success?: boolean; data?: altrpSupportChat }
      if (data.data) {
        setChat(data.data)
      }
    } catch (err) {
      console.error('Assign manager error:', err)
      setError(err instanceof Error ? err.message : 'Failed to assign manager')
    } finally {
      setAssigningManager(false)
    }
  }

  const breadcrumbItems = React.useMemo(() => {
    if (!chat) {
      return [
        { label: 'Admin Panel', href: '#' },
        { label: 'Поддержка', href: '/m/support' },
        { label: 'Загрузка...' },
      ]
    }
    return [
      { label: 'Admin Panel', href: '#' },
      { label: 'Поддержка', href: '/admin/support' },
      { label: chat.title || 'Обращение в поддержку' },
    ]
  }, [chat])

  if (loading) {
    return (
      <>
        <AdminHeader 
          title="Поддержка" 
          breadcrumbItems={[
            { label: 'Admin Panel', href: '#' },
            { label: 'Поддержка', href: '/m/support' },
            { label: 'Загрузка...' },
          ]}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    )
  }

  if (error && !chat) {
    return (
      <>
        <AdminHeader 
          title="Поддержка" 
          breadcrumbItems={[
            { label: 'Admin Panel', href: '#' },
            { label: 'Поддержка', href: '/m/support' },
            { label: 'Ошибка' },
          ]}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-6">
            <Button variant="ghost" onClick={() => router.push('/m/support')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  if (!chat) {
    return null
  }

  return (
    <>
      <AdminHeader title={chat.title || 'Обращение в поддержку'} breadcrumbItems={breadcrumbItems} />
      <main className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/m/support')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{chat.title || 'Обращение в поддержку'}</h1>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant={getStatusVariant(chat.statusName)}>
                    {getStatusLabel(chat.statusName)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Клиент: {chat.dataIn?.humanHaid || 'Неизвестно'}
                  </span>
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
                  messages.map((message) => {
                    const humanDisplayName = (message as any).humanDisplayName as string | null | undefined
                    const userUuid = (message as any).userUuid as string | null | undefined
                    const humanHaid = (message as any).humanHaid as string | null | undefined

                    return (
                      <SupportMessage
                        key={message.uuid}
                        message={message}
                        chat={chat}
                        formatDate={formatDate}
                        isClientView={false}
                        humanDisplayName={humanDisplayName}
                        humanHaid={humanHaid}
                        userUuid={userUuid}
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
                    )
                  })
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
                      onKeyDown={handleKeyDown}
                      placeholder="Введите сообщение..."
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

          <div className="flex justify-end items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="manager-select" className="text-sm font-medium">
                Ответственный:
              </Label>
              <Select
                value={chat.dataIn?.managerHaid || 'none'}
                onValueChange={(value) => handleAssignManager(value === 'none' ? null : value)}
                disabled={assigningManager}>
                <SelectTrigger id="manager-select" className="w-[200px]">
                  <SelectValue placeholder="Не назначен" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначен</SelectItem>
                  {operators.map((op) => (
                    <SelectItem key={op.humanAid || op.uuid} value={op.humanAid || ''}>
                      {op.fullName || op.humanAid || op.uuid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assigningManager && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {chat.statusName === 'OPEN' ? (
              <Button
                variant="outline"
                onClick={() => handleChangeStatus('CLOSED')}
                disabled={changingStatus}>
                {changingStatus ? (
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
            ) : (
              <Button
                variant="outline"
                onClick={() => handleChangeStatus('OPEN')}
                disabled={changingStatus}>
                {changingStatus ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Открытие...
                  </>
                ) : (
                  <>
                    <LockOpen className="mr-2 h-4 w-4" />
                    Открыть заявку
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </>
  )
}


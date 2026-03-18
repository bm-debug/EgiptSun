'use client'

import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from './ChatContext'
import { ChatInterface } from './ChatInterface'
import { useResizableChatSidebar } from '@/packages/hooks/use-resizable-chat-sidebar'
import { cn } from '@/lib/utils'
import { RTL_LOCALES } from '@/settings'

function ChatSidebarRail({
  onMouseDown,
  className,
  isRtl,
}: {
  onMouseDown: (e: React.MouseEvent) => void
  className?: string
  isRtl?: boolean
}) {
  return (
    <button
      type="button"
      data-slot="chat-sidebar-rail"
      aria-label="Resize chat sidebar"
      tabIndex={-1}
      onMouseDown={onMouseDown}
      title="Resize chat sidebar"
      className={cn(
        'absolute inset-y-0 z-20 hidden w-4 cursor-e-resize transition-all ease-linear after:absolute after:inset-y-0 after:w-[2px] hover:after:bg-sidebar-border sm:flex',
        isRtl
          ? 'right-0 translate-x-1/2 after:right-1/2'
          : 'left-0 -translate-x-1/2 after:left-1/2',
        className
      )}
    />
  )
}

function useIsRtl() {
  const [isRtl, setIsRtl] = React.useState(false)
  React.useEffect(() => {
    const check = () => {
      const locale = typeof window !== 'undefined' ? localStorage.getItem('sidebar-locale') : null
      setIsRtl(Boolean(locale && RTL_LOCALES.includes(locale)))
    }
    check()
    window.addEventListener('sidebar-locale-changed', check)
    return () => window.removeEventListener('sidebar-locale-changed', check)
  }, [])
  return isRtl
}

export function ChatSidebar() {
  const { isOpen, close } = useChat()
  const { handleMouseDown } = useResizableChatSidebar()
  const isRtl = useIsRtl()

  return (
    <div
      className={cn(
        'group hidden shrink-0 transition-[width] duration-200 ease-linear md:block',
        isOpen ? 'w-(--chat-sidebar-width)' : 'w-0'
      )}
      data-state={isOpen ? 'expanded' : 'collapsed'}
      data-slot="chat-sidebar"
    >
      <div
        className={cn(
          'fixed inset-y-0 z-10 hidden h-svh flex-col border-sidebar-border bg-background shadow-lg transition-[transform,visibility] duration-200 ease-linear md:flex',
          isRtl ? 'left-0 border-r' : 'right-0 border-l',
          isOpen
            ? 'translate-x-0 visible w-(--chat-sidebar-width)'
            : isRtl
              ? '-translate-x-full invisible w-(--chat-sidebar-width)'
              : 'translate-x-full invisible w-(--chat-sidebar-width)'
        )}
        role="dialog"
        aria-label="AI Chat"
      >
        {isOpen && <ChatSidebarRail onMouseDown={handleMouseDown} isRtl={isRtl} />}
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <span className="font-medium text-sm">AI Chat</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={close}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from './ChatContext'
import { ChatInterface } from './ChatInterface'
import { cn } from '@/lib/utils'
import { RTL_LOCALES } from '@/settings'

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

export function ChatPopup() {
  const { isOpen, close } = useChat()
  const isRtl = useIsRtl()

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 z-[10000] flex flex-col',
        isRtl ? 'left-4' : 'right-4',
        'w-[min(calc(100vw-2rem),400px)] h-[min(calc(100vh-8rem),560px)]',
        'rounded-xl border bg-background shadow-lg overflow-hidden'
      )}
      role="dialog"
      aria-label="AI Chat"
    >
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
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
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatInterface />
      </div>
    </div>
  )
}

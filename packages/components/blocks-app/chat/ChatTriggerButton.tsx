'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from './ChatContext'
import { cn } from '@/lib/utils'

interface ChatTriggerButtonProps {
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'primary' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export function ChatTriggerButton({
  className,
  size = 'sm',
  variant = 'ghost',
}: ChatTriggerButtonProps) {
  const { toggle } = useChat()

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={toggle}
      aria-label="Toggle AI chat"
    >
      <MessageCircle className="h-4 w-4" />
    </Button>
  )
}

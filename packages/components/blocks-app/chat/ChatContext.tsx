'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface ChatContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  const value: ChatContextValue = { isOpen, open, close, toggle }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (ctx === undefined) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return ctx
}

/** Returns chat context or undefined when outside ChatProvider (for optional usage e.g. in footer). */
export function useChatOptional(): ChatContextValue | undefined {
  return useContext(ChatContext)
}

"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

const CHAT_SIDEBAR_WIDTH_KEY = "chat-sidebar-width"
const MIN_WIDTH = 280
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 400

export function useResizableChatSidebar() {
  const [width, setWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CHAT_SIDEBAR_WIDTH_KEY)
      return saved ? parseInt(saved, 10) : DEFAULT_WIDTH
    }
    return DEFAULT_WIDTH
  })

  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const currentWidthRef = useRef(width)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [width])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return

    const deltaX = e.clientX - startX.current
    const delta = -deltaX
    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth.current + delta))
    currentWidthRef.current = newWidth
    setWidth(newWidth)
    document.documentElement.style.setProperty("--chat-sidebar-width", `${newWidth}px`)
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!isResizing.current) return

    isResizing.current = false
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
    localStorage.setItem(CHAT_SIDEBAR_WIDTH_KEY, currentWidthRef.current.toString())
  }, [])

  useLayoutEffect(() => {
    currentWidthRef.current = width
    document.documentElement.style.setProperty("--chat-sidebar-width", `${width}px`)
  }, [width])

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return {
    width,
    handleMouseDown,
  }
}

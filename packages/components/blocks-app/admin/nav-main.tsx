"use client"

import * as React from "react"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAdminState } from "../app-admin/AdminStateProvider"

export const NavMain = React.memo(function NavMain({
  items,
  platformLabel = "Platform",
  currentCollection = "",
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    category?: string
    collections?: string[]
    items?: {
      title: string
      url: string
      onClick?: () => void
    }[]
  }[]
  platformLabel?: string
  currentCollection?: string
}) {
  // Accordion behavior: only one group can be expanded at a time
  // Default: all collapsed (independent of locale)
  const [openKey, setOpenKey] = React.useState<string | null>(null)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{platformLabel}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const itemKey = (item as any).category || item.title
          // Determine if any sub-item is active by checking if currentCollection is in this category
          const isCategoryActive = (item as any).collections?.includes(currentCollection) ?? false
          return (
            <NavMainItem
              key={itemKey}
              item={item}
              currentCollection={currentCollection}
              open={openKey === itemKey}
              onOpenChange={(open) => {
                setOpenKey((prev) => (open ? itemKey : prev === itemKey ? null : prev))
              }}
            />
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}, (prevProps, nextProps) => {
  // Allow re-render if currentCollection changed (to update active state in NavMainItem)
  // But structure (items) should be static, so React will efficiently update only active classes
  if (prevProps.platformLabel !== nextProps.platformLabel) {
    return false // Re-render needed
  }
  
  // If items array reference is the same AND currentCollection unchanged, skip re-render
  if (prevProps.items === nextProps.items && prevProps.currentCollection === nextProps.currentCollection) {
    return true // Same reference and collection, skip re-render
  }
  
  if (prevProps.items.length !== nextProps.items.length) {
    return false // Re-render needed - structure changed
  }
  
  // Deep comparison of items structure
  for (let i = 0; i < prevProps.items.length; i++) {
    const prev = prevProps.items[i]
    const next = nextProps.items[i]
    
    // Check structure changes
    if (
      prev.title !== next.title ||
      prev.url !== next.url ||
      prev.items?.length !== next.items?.length
    ) {
      return false // Re-render needed - structure changed
    }
    
    // Compare sub-items if they exist
    if (prev.items && next.items) {
      for (let j = 0; j < prev.items.length; j++) {
        if (
          prev.items[j].title !== next.items[j].title ||
          prev.items[j].url !== next.items[j].url
        ) {
          return false // Re-render needed - sub-items changed
        }
      }
    }
  }
  
  // Structure is the same, but currentCollection might have changed
  // Allow re-render to update active state (React will efficiently update only CSS classes)
  return false
})

// Separate component for each collapsible item to preserve state
// Use controlled state internally to prevent re-renders
const NavMainItem = React.memo(function NavMainItem({
  item,
  currentCollection,
  open,
  onOpenChange,
}: {
  item: {
    title: string
    url: string
    icon?: LucideIcon
    category?: string
    collections?: string[]
    items?: {
      title: string
      url: string
      onClick?: () => void
    }[]
  }
  currentCollection: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const pathname = usePathname()
  const router = useRouter()
  const { pushState } = useAdminState()
  
  // Handler for navigation links that use query parameters
  const handleLinkClick = React.useCallback((e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    // Only handle admin collection links (with ?c= parameter)
    if (url.includes('?c=')) {
      e.preventDefault()
      const urlObj = new URL(url, window.location.origin)
      const collection = urlObj.searchParams.get('c')
      const page = urlObj.searchParams.get('p')
      const pageSize = urlObj.searchParams.get('ps')
      router.push(url)

      // if (collection) {
      //   pushState({
      //     collection,
      //     page: page ? Number(page) : 1,
      //     pageSize: pageSize ? Number(pageSize) : 10,
      //   })
      // } else {
      //   // Fallback to regular navigation
      //   router.push(url)
      // }
    }
    // For other links (like /admin/sql-editor), let Link handle it normally
  }, [pushState, router])
  
  // Determine active state from collection prop - simple comparison, no hooks
  const isCategoryActive = item.collections?.includes(currentCollection) ?? false
  
  // Check if any sub-item is active by pathname (for direct links like SQL Editor)
  const hasActiveSubItem = React.useMemo(() => {
    if (!item.items || !pathname) return false
    return item.items.some((subItem) => {
      // For collection links (with ?c= parameter), check currentCollection
      if (subItem.url.includes('?c=')) {
        const params = new URLSearchParams(subItem.url.split('?')[1] || '')
        return params.get('c') === currentCollection
      }
      // For direct links (like /admin/sql-editor), check pathname
      const subItemPath = subItem.url.split('?')[0]
      return pathname === subItemPath || pathname.startsWith(subItemPath + '/')
    })
  }, [item.items, pathname, currentCollection])
  
  const handleOpenChange = React.useCallback((open: boolean) => {
    onOpenChange(open)
  }, [onOpenChange])
  
  // When collapsed, use DropdownMenu instead of Collapsible
  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={item.title} isActive={isCategoryActive || hasActiveSubItem}>
              {item.icon && <item.icon />}
              {!isCollapsed && <span>{item.title}</span>}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="w-56"
            sideOffset={8}
          >
            {item.items?.map((subItem) => {
              // Determine if sub-item is active
              let isSubItemActive = false
              if (subItem.url.includes('?c=')) {
                // Collection link - check currentCollection
                const subItemParams = new URLSearchParams(subItem.url.split('?')[1] || '')
                const subItemCollection = subItemParams.get('c') || ''
                isSubItemActive = subItemCollection === currentCollection
              } else {
                // Direct link - check pathname
                const subItemPath = subItem.url.split('?')[0]
                isSubItemActive = pathname === subItemPath || (pathname?.startsWith(subItemPath + '/') ?? false)
              }
              
              return (
                <DropdownMenuItem key={subItem.url} asChild>
                  <a
                    href={subItem.url}
                    className={isSubItemActive ? "bg-accent" : ""}
                    onClick={(e) => {
                      if (subItem.onClick) {
                        e.preventDefault()
                        subItem.onClick()
                      } else {
                        handleLinkClick(e, subItem.url)
                      }
                    }}
                  >
                    <span>{subItem.title}</span>
                  </a>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }
  
  // When expanded, use Collapsible as before
  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={handleOpenChange}
      className="group/collapsible"
    >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title} isActive={isCategoryActive || hasActiveSubItem}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => {
                    // Determine if sub-item is active
                    let isSubItemActive = false
                    if (subItem.url.includes('?c=')) {
                      // Collection link - check currentCollection
                      const params = new URLSearchParams(subItem.url.split('?')[1] || '')
                      isSubItemActive = params.get('c') === currentCollection
                    } else {
                      // Direct link - check pathname
                      const subItemPath = subItem.url.split('?')[0]
                      isSubItemActive = pathname === subItemPath || (pathname?.startsWith(subItemPath + '/') ?? false)
                    }
                    
                    return (
                      <SidebarMenuSubItem key={subItem.url}>
                        <SidebarMenuSubButton asChild isActive={isSubItemActive}>
                          <Link 
                            href={subItem.url}
                            onClick={(e) => {
                              if (subItem.onClick) {
                                e.preventDefault()
                                subItem.onClick()
                              } else {
                                handleLinkClick(e, subItem.url)
                              }
                            }}
                          >
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
    </Collapsible>
  )
}, (prevProps, nextProps) => {
  // Only re-render if structure changed OR currentCollection changed (for active state)
  // We allow re-render when currentCollection changes to update active CSS classes
  // This is fine - React will efficiently update only the changed DOM nodes
  if (prevProps.open !== nextProps.open) {
    return false
  }
  if (prevProps.item.title !== nextProps.item.title) {
    return false
  }
  if (prevProps.item.url !== nextProps.item.url) {
    return false
  }
  if (prevProps.item.items?.length !== nextProps.item.items?.length) {
    return false
  }
  
  // Check sub-items structure
  if (prevProps.item.items && nextProps.item.items) {
    for (let i = 0; i < prevProps.item.items.length; i++) {
      if (prevProps.item.items[i].title !== nextProps.item.items[i].title) {
        return false
      }
      if (prevProps.item.items[i].url !== nextProps.item.items[i].url) {
        return false
      }
    }
  }
  
  // If item reference is the same AND currentCollection hasn't changed, skip re-render
  // Otherwise allow re-render to update active state (but structure is unchanged, so React optimizes DOM updates)
  if (prevProps.item === nextProps.item && prevProps.currentCollection === nextProps.currentCollection) {
    return true // Structure and collection unchanged - skip re-render
  }
  
  return false // Allow re-render - currentCollection changed (to update active state) or structure changed
})

"use client"

import * as React from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger, SidebarContext } from "@/components/ui/sidebar"

interface AdministratorHeaderProps {
  title?: string
  breadcrumbItems?: Array<{ label: string; href?: string }>
}

function SafeSidebarTrigger({ className }: { className?: string }) {
  const sidebarContext = React.useContext(SidebarContext)
  if (!sidebarContext) {
    return null
  }
  return <SidebarTrigger className={className} />
}

export const AdministratorHeader = React.memo(function AdministratorHeader({
  title,
  breadcrumbItems,
}: AdministratorHeaderProps) {
  const defaultBreadcrumbs = React.useMemo(() => {
    if (breadcrumbItems) {
      return breadcrumbItems
    }
    return [{ label: "Administrator Portal", href: "/a" }, { label: title || "Главная" }]
  }, [breadcrumbItems, title])

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SafeSidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {defaultBreadcrumbs.map((item, index) => {
            const isLast = index === defaultBreadcrumbs.length - 1
            return (
              <React.Fragment key={index}>
                {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                <BreadcrumbItem className={index > 0 ? "hidden md:block" : ""}>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={item.href || "#"}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
})

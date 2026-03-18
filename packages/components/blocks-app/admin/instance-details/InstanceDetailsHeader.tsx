'use client'
import { Badge } from "@/packages/components/ui/badge"
import { Button } from "@/packages/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { OLAPTab } from "@/shared/collections/BaseCollection"
import React from "react"

export interface InstanceDetailsHeaderProps {
    instance: any
    title: string
    collectionName: string
    altrpIndex: string
    olapTabs?: OLAPTab[]
    tabsList?: React.ReactNode
}

export function InstanceDetailsHeader({
    instance,
    title,
    collectionName,
    altrpIndex,
    olapTabs = [],
    tabsList
}: InstanceDetailsHeaderProps) {
    const router = useRouter()

    const handleBack = () => {
        router.push(`/admin?c=${collectionName}&p=1&ps=20`)
    }

    return (
        <div className="mb-4">
            <div className="flex flex-wrap xl:flex-nowrap items-center justify-between mb-4 relative gap-4">
                {/* Left block: back button + logo + title */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Button onClick={handleBack} variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        {instance.mediaId && (
                            <img
                                src={`/api/altrp/v1/admin/files/${instance.mediaId}`}
                                alt="Logo"
                                className="h-12 w-12 rounded object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                }}
                            />
                        )}
                        <div>
                            <h1 className="text-3xl font-bold">{title}</h1>
                            <p className="">{altrpIndex} </p>
                        </div>
                    </div>
                </div>

                {/* Right block: badge */}
                <div className="flex-1 flex justify-end xl:flex-1">
                    {instance.statusName && (
                        <Badge variant="secondary">
                            {instance.statusName}
                        </Badge>
                    )}
                </div>
                {/* Tabs */}
                {tabsList && (
                    <div className="w-full xl:w-auto xl:shrink-0">
                        {tabsList}
                    </div>
                )}
            </div>
        </div>
    )
}

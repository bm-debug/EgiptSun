"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { DeveloperHeader } from "@/components/blocks-app/developer/DeveloperHeader"
import { CampaignWizard, type CampaignData } from "@/components/blocks-app/developer/CampaignWizard"

export default function NewCampaignPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.id as string

  const handleComplete = async (campaignData: CampaignData) => {
    try {
      const response = await fetch("/api/altrp/v1/d/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          gameId,
          ...campaignData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any)) as any
        throw new Error(errorData.message || "Не удалось создать кампанию")
      }

      const result = await response.json()
      
      // Navigate to campaigns list or game detail
      router.push(`/d/campaigns`)
    } catch (error) {
      throw error
    }
  }

  return (
    <>
      <DeveloperHeader
        title="Новая кампания"
        breadcrumbItems={[
          { label: "Developer Portal", href: "/d" },
          { label: "Мои игры", href: "/d/games" },
          { label: "Игра", href: `/d/games/${gameId}` },
          { label: "Новая кампания" },
        ]}
      />
      <CampaignWizard gameId={gameId} onComplete={handleComplete} />
    </>
  )
}

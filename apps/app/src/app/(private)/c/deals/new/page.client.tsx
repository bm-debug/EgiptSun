'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { InstallmentApplicationForm } from '@/packages/components/blocks-app/cabinet/forms/InstallmentApplicationForm'
import { altrpHuman } from '@/shared/types/altrp'

export default function NewDealPageClient() {
  const router = useRouter()
  const [human, setHuman] = React.useState<altrpHuman | undefined>(undefined)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchHuman = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/altrp/v1/c/human', {
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({ error: 'Не удалось загрузить профиль' }))) as { error?: string; message?: string }
          throw new Error(errorData.message || errorData.error || 'Не удалось загрузить профиль')
        }

        const data = (await response.json()) as {
          success: boolean
          human?: altrpHuman
        }

        if (data.success && data.human) {
          // Check KYC status
          const dataIn = (data.human.dataIn || {}) as { kycStatus?: string }
          const kycStatus = dataIn.kycStatus || 'not_started'
          
          // If KYC is not verified, redirect to profile page with KYC tab active
          if (kycStatus !== 'verified') {
            router.push('/c/profile?tab=kyc')
            return
          }
          
          setHuman(data.human)
        } else {
          throw new Error('Профиль не найден')
        }
        setLoading(false)
      } catch (err) {
        console.error('Ошибка при загрузке профиля:', err)
        setError(err instanceof Error ? err.message : 'Не удалось загрузить профиль')
        setLoading(false)
      }
    }

    fetchHuman()
  }, [router])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Новая заявка на рассрочку</h1>
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Новая заявка на рассрочку</h1>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Новая заявка на рассрочку</h1>
      <InstallmentApplicationForm human={human} />
    </div>
  )
}


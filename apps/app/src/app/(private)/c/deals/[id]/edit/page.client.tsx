'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { InstallmentApplicationForm } from '@/components/blocks-app/cabinet/forms/InstallmentApplicationForm'
import type { altrpHuman } from '@/shared/types/altrp'

type DealDetailResponse = {
  deal: {
    id: string
    uuid: string
    title: string
    status: string
    statusName?: string
    createdAt: string
    dataIn?: any
    guarantors?: Array<{ haid: string; fullName?: string; dataIn?: { phone?: string } }>
  }
}

function mapDealToFormInitialValues(deal: DealDetailResponse['deal']) {
  const dataIn = deal.dataIn || {}

  const purchasePrice =
    dataIn.purchasePrice !== null && dataIn.purchasePrice !== undefined
      ? String(dataIn.purchasePrice)
      : dataIn.productPrice
        ? String(dataIn.productPrice)
        : ''

  const installmentTerm =
    dataIn.installmentTerm !== null && dataIn.installmentTerm !== undefined
      ? String(dataIn.installmentTerm)
      : Array.isArray(dataIn.term) && dataIn.term.length > 0
        ? String(dataIn.term[0])
        : dataIn.installmentTerm
          ? String(dataIn.installmentTerm)
          : ''

  // Extract guarantor haids from deal.guarantors if available
  const selectedGuarantors = deal.guarantors
    ?.map((g) => g.haid)
    .filter((haid): haid is string => Boolean(haid)) || []

  return {
    // Core fields
    firstName: dataIn.firstName ? String(dataIn.firstName) : '',
    lastName: dataIn.lastName ? String(dataIn.lastName) : '',
    middleName: dataIn.middleName ? String(dataIn.middleName) : '',
    phoneNumber: dataIn.phone ? String(dataIn.phone) : dataIn.phoneNumber ? String(dataIn.phoneNumber) : '',
    email: dataIn.email ? String(dataIn.email) : '',
    purchasePrice,
    installmentTerm,
    downPayment:
      dataIn.downPayment !== null && dataIn.downPayment !== undefined ? String(dataIn.downPayment) : '',
    monthlyPayment:
      dataIn.monthlyPayment !== null && dataIn.monthlyPayment !== undefined ? String(dataIn.monthlyPayment) : '',
    comfortableMonthlyPayment: dataIn.comfortableMonthlyPayment ? String(dataIn.comfortableMonthlyPayment) : '',
    productName: dataIn.productName ? String(dataIn.productName) : '',
    purchaseLocation: dataIn.purchaseLocation ? String(dataIn.purchaseLocation) : '',
    partnerLocation: dataIn.partnerLocation ? String(dataIn.partnerLocation) : '',
    convenientPaymentDate: dataIn.convenientPaymentDate ? String(dataIn.convenientPaymentDate) : '',

    // Pre-select guarantors from current deal
    selectedGuarantors,

    // Keep consent unchecked by default (user confirms again on edit)
    consentToProcessData: false,
  }
}

export default function DealEditPageClient() {
  const params = useParams()
  const dealId = params.id as string

  const [human, setHuman] = React.useState<altrpHuman | undefined>(undefined)
  const [deal, setDeal] = React.useState<DealDetailResponse['deal'] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const [dealRes, humanRes] = await Promise.all([
          fetch(`/api/altrp/v1/c/deals/${dealId}`, { credentials: 'include' }),
          fetch('/api/altrp/v1/c/human', { credentials: 'include' }),
        ])

        if (!dealRes.ok) {
          const errorData = (await dealRes.json().catch(() => ({ error: 'Не удалось загрузить заявку' }))) as {
            error?: string
          }
          throw new Error(errorData.error || 'Не удалось загрузить заявку')
        }
        if (!humanRes.ok) {
          const errorData = (await humanRes.json().catch(() => ({ error: 'Не удалось загрузить профиль' }))) as {
            error?: string
            message?: string
          }
          throw new Error(errorData.message || errorData.error || 'Не удалось загрузить профиль')
        }

        const dealData = (await dealRes.json()) as DealDetailResponse
        const humanData = (await humanRes.json()) as { success: boolean; human?: altrpHuman }

        setDeal(dealData.deal)
        setHuman(humanData.human)
        setLoading(false)
      } catch (err) {
        console.error('Deal edit load error:', err)
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные')
        setLoading(false)
      }
    }

    if (dealId) load()
  }, [dealId])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Редактирование заявки</h1>
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Редактирование заявки</h1>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error || 'Заявка не найдена'}
        </div>
        <div>
          <Button asChild variant="outline">
            <Link href="/c/deals">К списку заявок</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (deal.statusName !== 'SCORING') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Редактирование заявки</h1>
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          Редактирование доступно только для заявок в статусе «Скоринг».
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href={`/c/deals/${dealId}`}>Назад к заявке</Link>
          </Button>
          <Button asChild>
            <Link href="/c/deals">К списку заявок</Link>
          </Button>
        </div>
      </div>
    )
  }

  const initialValues = mapDealToFormInitialValues(deal)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Редактирование заявки</h1>
      <InstallmentApplicationForm
        human={human}
        initialValues={initialValues}
        submitUrl={`/api/altrp/v1/c/deals/${dealId}`}
        submitMethod="PUT"
        successRedirectUrl={`/c/deals/${dealId}`}
      />
    </div>
  )
}



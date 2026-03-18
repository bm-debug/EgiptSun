'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, MoreHorizontal, Eye, Download, Plus } from 'lucide-react'

type FieldType = 'text' | 'textarea' | 'tel' | 'number' | 'select' | 'file' | 'checkbox'

type FormField = {
  id: string
  label: string
  type: FieldType
  required?: boolean
  options?: Array<{ value: string; label: string }>
  attributes?: {
    multiple?: boolean
    accept?: string
    readonly?: boolean
  }
}

type FormSection = {
  id: string
  title: string
  fields: FormField[]
}

type Deal = {
  id: string
  uuid: string
  clientName: string
  productName: string
  amount: number
  status: string
  createdAt: string
}

const applicationSections: FormSection[] = [
  {
    id: 'clientPrimaryInfo',
    title: 'Основная информация',
    fields: [
      { id: 'firstName', label: 'Имя *', type: 'text', required: true },
      { id: 'lastName', label: 'Фамилия *', type: 'text', required: true },
      {
        id: 'phoneNumber',
        label: 'Телефон *',
        type: 'tel',
        required: true,
      },
      { id: 'productName', label: 'Наименование товара', type: 'text' },
      { id: 'productPrice', label: 'Цена товара', type: 'number' },
      { id: 'purchaseLocation', label: 'Место покупки', type: 'text' },
      { id: 'permanentAddress', label: 'Фактический адрес *', type: 'textarea', required: true },
    ],
  },
  {
    id: 'productAndTerms',
    title: 'Товар и условия',
    fields: [
      {
        id: 'documentPhotos',
        label: 'Фото документов *',
        type: 'file',
        required: true,
        attributes: { multiple: true, accept: 'image/*,.pdf' },
      },
      { id: 'comfortableMonthlyPayment', label: 'Комфортный платеж', type: 'number' },
      { id: 'purchasePrice', label: 'Цена закупа *', type: 'number', required: true },
      { id: 'downPayment', label: 'Первый взнос *', type: 'number', required: true },
      { id: 'installmentTerm', label: 'Срок (мес.) *', type: 'number', required: true },
      { id: 'monthlyPayment', label: 'Ежемесячный платеж *', type: 'number', required: true },
      { id: 'markupAmount', label: 'Наценка', type: 'number' },
      { id: 'partnerLocation', label: 'Где находится товар?', type: 'text' },
      { id: 'convenientPaymentDate', label: 'Удобная дата оплаты', type: 'number' },
    ],
  },
  {
    id: 'securityReview',
    title: 'Рассмотрение (СБ)',
    fields: [
      { id: 'fsspInfo_sb', label: 'Информация из ФССП *', type: 'textarea', required: true },
      { id: 'getcontactInfo_sb', label: 'Информация из GetContact *', type: 'textarea', required: true },
      { id: 'purchasePurpose_sb', label: 'Цель покупки', type: 'textarea' },
      { id: 'referralSource_sb', label: 'От кого перешли по ссылке', type: 'textarea' },
      { id: 'employmentInfo_sb', label: 'Место работы *', type: 'textarea', required: true },
      { id: 'additionalIncome_sb', label: 'Доп. доходы', type: 'textarea' },
      { id: 'officialIncome_sb', label: 'Официальные доходы *', type: 'textarea', required: true },
      {
        id: 'maritalStatus_sb',
        label: 'Семейное положение *',
        type: 'select',
        required: true,
        options: [
          { value: 'married', label: 'Женат/замужем' },
          { value: 'single', label: 'Холост/не замужем' },
          { value: 'divorced', label: 'В разводе' },
          { value: 'widowed', label: 'Вдова/вдовец' },
        ],
      },
      { id: 'childrenInfo_sb', label: 'Дети', type: 'textarea' },
      { id: 'creditHistory_sb', label: 'Кредиты / рассрочки *', type: 'textarea', required: true },
      { id: 'collateralInfo_sb', label: 'Имущество для залога', type: 'textarea' },
      { id: 'housingInfo_sb', label: 'Жилье', type: 'textarea' },
      { id: 'additionalContact_sb', label: 'Дополнительный номер *', type: 'tel', required: true },
      { id: 'relativesContactPermission_sb', label: 'Контакт родственников', type: 'textarea' },
      { id: 'localFeedback_sb', label: 'Отзыв с местности *', type: 'textarea', required: true },
      { id: 'psychologicalAssessment_sb', label: 'Психологическая оценка *', type: 'textarea', required: true },
    ],
  },
  {
    id: 'guarantor1',
    title: 'Поручитель 1',
    fields: [
      { id: 'responsibleAgent_p1', label: 'Ответственный *', type: 'text', required: true },
      { id: 'fsspInfo_p1', label: 'ФССП *', type: 'textarea', required: true },
      { id: 'getcontactInfo_p1', label: 'GetContact *', type: 'textarea', required: true },
      { id: 'relationship_p1', label: 'Кем приходится? *', type: 'text', required: true },
      { id: 'fullName_p1', label: 'ФИО поручителя', type: 'text' },
      { id: 'passportPhoto_p1', label: 'Паспорт', type: 'file', attributes: { accept: 'image/*,.pdf' } },
      { id: 'phoneNumber_p1', label: 'Номер телефона', type: 'tel' },
      { id: 'address_p1', label: 'Адрес *', type: 'textarea', required: true },
      { id: 'employmentIncome_p1', label: 'Трудоустройство и доходы', type: 'textarea' },
      { id: 'maritalStatus_p1', label: 'Семейное положение *', type: 'text', required: true },
      { id: 'childrenInfo_p1', label: 'Дети', type: 'textarea' },
      { id: 'additionalIncome_p1', label: 'Доп. доходы *', type: 'textarea', required: true },
      { id: 'creditHistory_p1', label: 'Кредиты/рассрочки', type: 'textarea' },
      { id: 'collateralInfo_p1', label: 'Имущество', type: 'textarea' },
      { id: 'housingInfo_p1', label: 'Жилье', type: 'textarea' },
      { id: 'isNewClient_p1', label: 'Клиент новый?', type: 'textarea' },
      { id: 'psychologicalAssessment_p1', label: 'Психологическая оценка', type: 'textarea' },
      { id: 'additionalPhoneNumber_p1', label: 'Дополнительный номер', type: 'tel' },
    ],
  },
  {
    id: 'guarantor2',
    title: 'Поручитель 2',
    fields: [
      { id: 'fsspInfo_p2', label: 'ФССП', type: 'textarea' },
      { id: 'getcontactInfo_p2', label: 'GetContact', type: 'textarea' },
      { id: 'fullName_p2', label: 'ФИО поручителя 2', type: 'text' },
      { id: 'passportPhoto_p2', label: 'Паспорт', type: 'file', attributes: { accept: 'image/*,.pdf' } },
      { id: 'phoneNumber_p2', label: 'Номер телефона', type: 'tel' },
      { id: 'relationship_p2', label: 'Кем приходится?', type: 'text' },
      { id: 'address_p2', label: 'Фактическое место жительства', type: 'textarea' },
      { id: 'employmentIncome_p2', label: 'Трудоустройство и доходы *', type: 'textarea', required: true },
      { id: 'maritalStatus_p2', label: 'Семейное положение', type: 'text' },
      { id: 'childrenInfo_p2', label: 'Дети', type: 'textarea' },
      { id: 'creditHistory_p2', label: 'Кредиты/рассрочки', type: 'textarea' },
      { id: 'additionalIncome_p2', label: 'Доп. доходы', type: 'textarea' },
      { id: 'relativesContact_p2', label: 'Номер родственников', type: 'tel' },
      { id: 'isNewClient_p2', label: 'Клиент новый?', type: 'textarea' },
      { id: 'psychologicalAssessment_p2', label: 'Психологическая оценка', type: 'textarea' },
      { id: 'additionalPhoneNumber_p2', label: 'Дополнительный номер', type: 'tel' },
    ],
  },
  {
    id: 'finalDocs',
    title: 'Документы',
    fields: [
      {
        id: 'contractDocuments',
        label: 'ДКП и другие документы',
        type: 'file',
        attributes: { multiple: true, accept: '.pdf,.doc,.docx,image/*' },
      },
    ],
  },
  {
    id: 'consent',
    title: 'Согласие',
    fields: [
      {
        id: 'consentToProcessData',
        label:
          'Нажимая кнопку «Отправить», я даю свое согласие на обработку персональных данных *',
        type: 'checkbox',
        required: true,
      },
    ],
  },
]

export default function PartnerDealsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [deals, setDeals] = React.useState<Deal[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [formValues, setFormValues] = React.useState<Record<string, string | number | boolean>>({
    consentToProcessData: false,
  })
  const [fileValues, setFileValues] = React.useState<Record<string, File[]>>({})

  React.useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/altrp/v1/p/deals', {
          credentials: 'include',
        })

        if (response.status === 401 || response.status === 403) {
          throw new Error('Недостаточно прав для просмотра заявок')
        }

        if (!response.ok) {
          throw new Error('Не удалось загрузить заявки')
        }

        const data = await response.json() as { success?: boolean; data?: { deals?: Deal[] }; message?: string }

        if (!data.success || !data.data?.deals) {
          throw new Error(data.message || 'Ответ сервера не содержит данных')
        }

        setDeals(data.data.deals)
      } catch (err) {
        console.error('Deals fetch error:', err)
        setError(err instanceof Error ? err.message : 'Не удалось загрузить заявки')
        setDeals([])
      } finally {
        setLoading(false)
      }
    }

    fetchDeals()
  }, [])

  React.useEffect(() => {
    if (searchParams?.get('create') === '1') {
      setCreateOpen(true)
    }
  }, [searchParams])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Одобрена':
        return 'default'
      case 'На рассмотрении':
        return 'secondary'
      case 'Отклонена':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const handleView = (dealId: string) => {
    router.push(`/p/deals/${dealId}`)
  }

  const handleDownload = (dealId: string) => {
    console.log('Download contract for deal:', dealId)
  }

  const handleFieldChange = (id: string, value: string | number | boolean) => {
    setFormValues((prev) => ({ ...prev, [id]: value }))
  }

  const handleFileChange = (id: string, files: FileList | null) => {
    if (!files) return
    setFileValues((prev) => ({ ...prev, [id]: Array.from(files) }))
  }

  const validateForm = () => {
    const missing: string[] = []

    applicationSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (!field.required) return

        if (field.type === 'file') {
          if (!fileValues[field.id] || fileValues[field.id].length === 0) {
            missing.push(field.label)
          }
          return
        }

        if (field.type === 'checkbox') {
          if (!formValues[field.id]) {
            missing.push(field.label)
          }
          return
        }

        const value = formValues[field.id]
        if (value === undefined || value === null || value === '') {
          missing.push(field.label)
        }
      })
    })

    return missing
  }

  const resetForm = () => {
    setFormValues({ consentToProcessData: false })
    setFileValues({})
  }

  const handleSubmit = async () => {
    const missing = validateForm()
    if (missing.length > 0) {
      setError(`Заполните обязательные поля: ${missing.join(', ')}`)
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccessMessage(null)

      const payload = { ...formValues, consentToProcessData: Boolean(formValues.consentToProcessData) }
      const formData = new FormData()
      formData.append('payload', JSON.stringify(payload))

      Object.entries(fileValues).forEach(([key, files]) => {
        files.forEach((file) => formData.append(key, file))
      })

      const response = await fetch('/api/altrp/v1/p/deals', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json() as { success?: boolean; data?: { deal?: Deal }; message?: string; error?: string }

      const createdDeal = data.data?.deal

      if (!response.ok || !data.success || !createdDeal) {
        throw new Error(data.message || data.error || 'Не удалось создать заявку')
      }

      setDeals((prev) => [createdDeal, ...prev])
      setSuccessMessage(data.message || 'Заявка отправлена на рассмотрение')
      resetForm()
      setCreateOpen(false)
      router.replace('/p/deals')
    } catch (err) {
      console.error('Create deal error:', err)
      setError(err instanceof Error ? err.message : 'Не удалось создать заявку')
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field: FormField) => {
    const commonProps = {
      id: field.id,
      required: field.required,
    }

    if (field.type === 'textarea') {
      return (
        <Textarea
          {...commonProps}
          value={(formValues[field.id] as string) || ''}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          rows={3}
        />
      )
    }

    if (field.type === 'select') {
      return (
        <Select
          value={(formValues[field.id] as string) || ''}
          onValueChange={(value) => handleFieldChange(field.id, value)}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите значение" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (field.type === 'file') {
      return (
        <Input
          {...commonProps}
          type="file"
          multiple={field.attributes?.multiple}
          accept={field.attributes?.accept}
          onChange={(e) => handleFileChange(field.id, e.target.files)}
        />
      )
    }

    if (field.type === 'checkbox') {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={field.id}
            checked={Boolean(formValues[field.id])}
            onCheckedChange={(checked) => handleFieldChange(field.id, Boolean(checked))}
          />
          <Label htmlFor={field.id} className="font-normal text-sm leading-snug">
            {field.label}
          </Label>
        </div>
      )
    }

    return (
      <Input
        {...commonProps}
        type={field.type === 'number' ? 'number' : field.type === 'tel' ? 'tel' : 'text'}
        value={(formValues[field.id] as string | number | undefined) ?? ''}
        onChange={(e) => handleFieldChange(field.id, field.type === 'number' ? Number(e.target.value) : e.target.value)}
        inputMode={field.type === 'number' ? 'numeric' : undefined}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Заявки</h1>
        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            router.replace('/p/deals')
          }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Создать заявку
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Полная заявка на рассрочку</DialogTitle>
              <DialogDescription>
                Заполните данные клиента, товара и внутренние поля службы безопасности.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {successMessage && (
                <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700">
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {applicationSections.map((section) => (
                <div key={section.id} className="space-y-3">
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {section.fields.map((field) => (
                      <div key={field.id} className={field.type === 'checkbox' ? 'col-span-2' : ''}>
                        {field.type !== 'checkbox' && (
                          <Label htmlFor={field.id} className="mb-2 block text-sm font-medium">
                            {field.label}
                          </Label>
                        )}
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm()
                  setCreateOpen(false)
                  router.replace('/p/deals')
                }}>
                Отмена
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Отправить заявку'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все заявки</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : deals.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              Нет заявок
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Товар</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.uuid}>
                    <TableCell className="font-medium">{deal.id}</TableCell>
                    <TableCell>{deal.clientName}</TableCell>
                    <TableCell>{deal.productName}</TableCell>
                    <TableCell>{formatCurrency(deal.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(deal.status)}>
                        {deal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(deal.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(deal.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Просмотреть
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(deal.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            Скачать договор
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


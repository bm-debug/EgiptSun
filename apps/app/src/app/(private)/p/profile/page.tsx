'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

export default function PartnerProfilePage() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState({
    name: '',
    address: '',
    inn: '',
    kpp: '',
    ogrn: '',
    bankName: '',
    bankAccount: '',
    correspondentAccount: '',
    bik: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  })

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/altrp/v1/p/profile', {
          credentials: 'include',
        })

        if (response.status === 401 || response.status === 403) {
          throw new Error('Недостаточно прав для просмотра профиля партнера')
        }

        if (!response.ok) {
          throw new Error('Не удалось загрузить профиль')
        }

        const data = await response.json() as { success?: boolean; profile?: typeof formData; message?: string }

        if (!data.profile) {
          throw new Error(data.message || 'Ответ сервера не содержит данных профиля')
        }

        setFormData((prev) => ({
          ...prev,
          ...data.profile,
        }))
        setLoading(false)
      } catch (err) {
        console.error('Profile fetch error:', err)
        setError(err instanceof Error ? err.message : 'Не удалось загрузить профиль')
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/altrp/v1/p/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json() as { success?: boolean; message?: string; error?: string }

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Не удалось сохранить профиль')
      }

      setSuccess(data.message || 'Профиль сохранен')
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Не удалось обновить профиль')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Профиль магазина</h1>

      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700">
              {success}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название магазина *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Название магазина"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Адрес *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Полный адрес магазина"
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contactName">Контактное лицо</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactName: e.target.value }))}
                placeholder="Имя менеджера"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email для связи</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="partner@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Телефон</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Реквизиты</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inn">ИНН</Label>
              <Input
                id="inn"
                value={formData.inn}
                onChange={(e) => setFormData((prev) => ({ ...prev, inn: e.target.value }))}
                placeholder="ИНН"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kpp">КПП</Label>
              <Input
                id="kpp"
                value={formData.kpp}
                onChange={(e) => setFormData((prev) => ({ ...prev, kpp: e.target.value }))}
                placeholder="КПП"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ogrn">ОГРН</Label>
              <Input
                id="ogrn"
                value={formData.ogrn}
                onChange={(e) => setFormData((prev) => ({ ...prev, ogrn: e.target.value }))}
                placeholder="ОГРН"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Название банка</Label>
            <Input
              id="bankName"
              value={formData.bankName}
              onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))}
              placeholder="Название банка"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Расчетный счет</Label>
              <Input
                id="bankAccount"
                value={formData.bankAccount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bankAccount: e.target.value }))
                }
                placeholder="Расчетный счет"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correspondentAccount">Корреспондентский счет</Label>
              <Input
                id="correspondentAccount"
                value={formData.correspondentAccount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, correspondentAccount: e.target.value }))
                }
                placeholder="Корреспондентский счет"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bik">БИК</Label>
              <Input
                id="bik"
                value={formData.bik}
                onChange={(e) => setFormData((prev) => ({ ...prev, bik: e.target.value }))}
                placeholder="БИК"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить изменения'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


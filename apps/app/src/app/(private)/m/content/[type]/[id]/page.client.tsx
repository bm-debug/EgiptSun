'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import { TipTapEditor } from '@/packages/components/blocks-app/cms/TipTapEditor'

export default function AdminContentEditPage() {
  const params = useParams()
  const router = useRouter()
  const type = params?.type as string
  const id = params?.id as string
  const isNew = id === 'new'

  const [loading, setLoading] = React.useState(!isNew)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState({
    title: '',
    slug: '',
    category: '',
    content: '',
    published: false,
  })

  React.useEffect(() => {
    if (isNew) {
      setLoading(false)
      return
    }

    const fetchContent = async () => {
      try {
        setLoading(true)
        // TODO: Replace with actual API endpoint
        // const response = await fetch(`/api/admin/content/${type}/${id}`, { credentials: 'include' })
        
        // Mock data
        setTimeout(() => {
          setFormData({
            title: 'Пример заголовка',
            slug: 'primer-zagolovka',
            category: 'category-1',
            content: '<p>Пример содержимого</p>',
            published: true,
          })
          setLoading(false)
        }, 500)
      } catch (err) {
        console.error('Content fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load content')
        setLoading(false)
      }
    }

    fetchContent()
  }, [type, id, isNew])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // TODO: Implement save API
      // const response = await fetch(`/api/admin/content/${type}/${id || 'new'}`, {
      //   method: isNew ? 'POST' : 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   credentials: 'include',
      //   body: JSON.stringify(formData),
      // })

      // if (!response.ok) {
      //   throw new Error('Failed to save content')
      // }

      router.push(`/m/content?tab=${type}`)
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'blog':
        return 'Статья блога'
      case 'pages':
        return 'Страница'
      case 'faq':
        return 'FAQ'
      default:
        return 'Контент'
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader title={isNew ? `Создать ${getTypeLabel()}` : `Редактировать ${getTypeLabel()}`} />
        <main className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title={isNew ? `Создать ${getTypeLabel()}` : `Редактировать ${getTypeLabel()}`} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {isNew ? `Создать ${getTypeLabel()}` : `Редактировать ${getTypeLabel()}`}
          </h1>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Заголовок *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Введите заголовок"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL (slug) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="url-slug"
                required
              />
            </div>

            {type === 'blog' && (
              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category-1">Категория 1</SelectItem>
                    <SelectItem value="category-2">Категория 2</SelectItem>
                    <SelectItem value="category-3">Категория 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="content">Содержимое *</Label>
              <TipTapEditor
                content={formData.content}
                onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
                placeholder="Введите содержимое..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, published: checked }))}
              />
              <Label htmlFor="published">Опубликовано</Label>
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
    </>
  )
}


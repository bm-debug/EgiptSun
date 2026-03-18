'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TipTapEditor } from '@/packages/components/blocks-app/cms/TipTapEditor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, Save, ArrowLeft, Plus } from 'lucide-react'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import { slugify } from '@/lib/slugify'
import { LANGUAGES } from '@/settings'
import { altrpText, TaxonomyOption } from '@/shared/types/altrp'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DateTimePicker } from '@/components/ui/date-time-picker'

export default function AdminBlogEditPage() {
  const params = useParams()
  const router = useRouter()
  const taid = params?.taid as string
  const isNew = taid === 'new'

  const [loading, setLoading] = React.useState(!isNew)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [categories, setCategories] = React.useState<TaxonomyOption[]>([])
  const [loadingCategories, setLoadingCategories] = React.useState(true)
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = React.useState(false)
  const [newCategoryName, setNewCategoryName] = React.useState('')

  const [formData, setFormData] = React.useState({
    title: '',
    slug: '',
    category: '',
    content: '',
    author: '',
    readTime: 0,
    date: new Date(),
    statusName: 'DRAFT' as 'DRAFT' | 'ON_APPROVAL' | 'PUBLISHED',
    locale: 'en',
  })

  // Отслеживаем, был ли slug изменен вручную
  const slugManuallyChanged = React.useRef(false)
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    fetchCategories()
    if (!isNew) {
      fetchBlogPost()
    }
  }, [taid, isNew])

  // Автоматическое обновление slug при изменении title с debounce
  React.useEffect(() => {
    // Если slug был изменен вручную, не обновляем автоматически
    if (slugManuallyChanged.current) {
      return
    }

    // Очищаем предыдущий таймер
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Устанавливаем новый таймер с debounce 500ms
    debounceTimeoutRef.current = setTimeout(() => {
      if (formData.title.trim()) {
        const newSlug = slugify(formData.title)
        setFormData((prev) => ({
          ...prev,
          slug: newSlug,
        }))
      }
    }, 500)

    // Очистка при размонтировании
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [formData.title])

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const filters = JSON.stringify({
        conditions: [
          { field: 'entity', operator: 'eq', values: ['blog.category'] },
        ],
      })
      const response = await fetch(
        `/api/admin/taxonomies?filters=${encodeURIComponent(filters)}`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }

      const data = await response.json() as { docs: TaxonomyOption[] }
      setCategories(data.docs || [])
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchBlogPost = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/altrp/v1/admin/content/blog/${taid}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch blog post')
      }

      const data = await response.json() as { success: boolean; text: altrpText }
      if (data.success && data.text) {
        const text = data.text
        const dataIn = text.dataIn || {}
        setFormData({
          title: text.title || '',
          slug: dataIn.slug || '',
          category: text.category || '',
          content: text.content || '',
          author: dataIn.author || '',
          readTime: dataIn.readTime || 0,
          date: text.createdAt ? new Date(text.createdAt) : new Date(),
          statusName: (text.statusName as 'DRAFT' | 'ON_APPROVAL' | 'PUBLISHED') || 'DRAFT',
          locale: dataIn.locale ?? 'en',
        })
        // Сбрасываем флаг при загрузке, чтобы slug обновлялся автоматически при изменении заголовка
        slugManuallyChanged.current = false
      }
    } catch (err) {
      console.error('Failed to fetch blog post:', err)
      setError(err instanceof Error ? err.message : 'Failed to load blog post')
    } finally {
      setLoading(false)
    }
  }

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
    }))
    // Сбрасываем флаг ручного изменения slug, чтобы он обновился автоматически
    slugManuallyChanged.current = false
  }

  const handleSlugChange = (slug: string) => {
    setFormData((prev) => ({
      ...prev,
      slug,
    }))
    // Отмечаем, что slug был изменен вручную
    slugManuallyChanged.current = true
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      if (!formData.title.trim()) {
        setError('Заголовок обязателен для заполнения')
        return
      }

      if (!formData.slug.trim()) {
        setError('URL (slug) обязателен для заполнения')
        return
      }

      const payload = {
        title: formData.title.trim(),
        type: 'BLOG',
        statusName: formData.statusName,
        category: formData.category || null,
        content: formData.content,
        dataIn: {
          slug: formData.slug.trim(),
          author: formData.author.trim() || 'Altrp',
          readTime: formData.readTime || 0,
          date: formData.date.toISOString(),
          locale: formData.locale || 'en',
        },
        isPublic: formData.statusName === 'PUBLISHED',
      }

      const url = isNew
        ? '/api/altrp/v1/admin/content/blog'
        : `/api/altrp/v1/admin/content/blog/${taid}`

      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string }
        throw new Error(errorData.message || errorData.error || 'Failed to save blog post')
      }

      const data = await response.json() as { success?: boolean; text?: altrpText; message?: string }
      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/m/content/blog')
        }, 1000)
      } else {
        throw new Error(data.message || 'Failed to save blog post')
      }
    } catch (err) {
      console.error('Failed to save blog post:', err)
      setError(err instanceof Error ? err.message : 'Failed to save blog post')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      return
    }

    try {
      // Create category via taxonomy API
      const response = await fetch('/api/admin/taxonomies', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'blog.category',
          name: newCategoryName.trim().toLowerCase().replace(/\s+/g, '-'),
          title: newCategoryName.trim(),
          sortOrder: (categories.length + 1) * 10,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create category')
      }

      const newCategory = await response.json() as TaxonomyOption
      setCategories((prev) => [...prev, newCategory])
      setFormData((prev) => ({ ...prev, category: newCategory.name }))
      setNewCategoryDialogOpen(false)
      setNewCategoryName('')
    } catch (err) {
      console.error('Failed to create category:', err)
      setError('Не удалось создать категорию')
    }
  }

  const breadcrumbItems = React.useMemo(
    () => [
      { label: 'Admin Panel', href: '#' },
      { label: 'Блог', href: '/m/content/blog' },
      { label: isNew ? 'Создать статью' : 'Редактировать статью' },
    ],
    [isNew]
  )

  if (loading) {
    return (
      <>
        <AdminHeader
          title={isNew ? 'Создать статью блога' : 'Редактировать статью блога'}
          breadcrumbItems={breadcrumbItems}
        />
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
      <AdminHeader
        title={isNew ? 'Создать статью блога' : 'Редактировать статью блога'}
        breadcrumbItems={breadcrumbItems}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/m/content/blog')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold">
                {isNew ? 'Создать статью блога' : 'Редактировать статью блога'}
              </h1>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>Статья успешно сохранена</AlertDescription>
            </Alert>
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
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Введите заголовок"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL (slug) *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="url-slug"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Автоматически генерируется из заголовка (обновляется с задержкой 500мс)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locale">Язык (locale)</Label>
                <Select
                  value={formData.locale}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, locale: value }))}>
                  <SelectTrigger id="locale">
                    <SelectValue placeholder="Язык" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Пост будет отображаться на странице /{formData.locale}/blog
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                    disabled={loadingCategories}>
                    <SelectTrigger id="category" className="flex-1">
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.title || cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" type="button">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Добавить категорию</DialogTitle>
                        <DialogDescription>
                          Введите название новой категории
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="newCategory">Название категории</Label>
                        <Input
                          id="newCategory"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Название категории"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleCreateCategory()
                            }
                          }}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setNewCategoryDialogOpen(false)
                            setNewCategoryName('')
                          }}>
                          Отмена
                        </Button>
                        <Button onClick={handleCreateCategory}>
                          Добавить
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <Select
                  value={formData.statusName}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      statusName: value as 'DRAFT' | 'ON_APPROVAL' | 'PUBLISHED',
                    }))
                  }>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Черновик</SelectItem>
                    <SelectItem value="ON_APPROVAL">На утверждении</SelectItem>
                    <SelectItem value="PUBLISHED">Опубликовано</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Автор</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))}
                  placeholder="Введите имя автора"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Дата публикации</Label>
                <DateTimePicker
                  value={formData.date}
                  onChange={(date) => setFormData((prev) => ({ ...prev, date: date || new Date() }))}
                  mode="date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="readTime">Время чтения (минуты)</Label>
                <Input
                  id="readTime"
                  type="number"
                  min="0"
                  value={formData.readTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, readTime: parseInt(e.target.value) || 0 }))}
                  placeholder="Время чтения в минутах"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Содержимое *</Label>
                <TipTapEditor
                  content={formData.content}
                  onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
                  placeholder="Введите содержимое статьи..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}


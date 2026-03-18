'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus } from 'lucide-react'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import { useRouter } from 'next/navigation'

interface ContentItem {
  id: string
  title: string
  slug: string
  status: 'published' | 'draft'
  createdAt: string
  updatedAt: string
}

export default function AdminPagesPage() {
  const router = useRouter()
  const [pages, setPages] = React.useState<ContentItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        // TODO: Replace with actual API endpoint
        // const response = await fetch('/api/admin/content/pages', { credentials: 'include' })
        
        // Mock data
        setTimeout(() => {
          setPages([
            {
              id: 'page-1',
              title: 'О компании',
              slug: 'about',
              status: 'published',
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'page-2',
              title: 'Контакты',
              slug: 'contacts',
              status: 'published',
              createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ])
          setLoading(false)
        }, 500)
      } catch (err) {
        console.error('Content fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load content')
        setLoading(false)
      }
    }

    fetchContent()
  }, [])

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  const handleAddNew = () => {
    router.push('/m/content/pages/new')
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Страницы" />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <AdminHeader title="Страницы" />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Страницы" />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Страницы</h1>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить новую страницу
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Страницы</CardTitle>
            </CardHeader>
            <CardContent>
              {pages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Нет страниц
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Обновлено</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((page) => (
                      <TableRow
                        key={page.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/m/content/pages/${page.id}`)}>
                        <TableCell className="font-medium">{page.title}</TableCell>
                        <TableCell className="text-muted-foreground">{page.slug}</TableCell>
                        <TableCell>
                          <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                            {page.status === 'published' ? 'Опубликовано' : 'Черновик'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(page.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(page.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}


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

export default function AdminFaqPage() {
  const router = useRouter()
  const [faqs, setFaqs] = React.useState<ContentItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        // TODO: Replace with actual API endpoint
        // const response = await fetch('/api/admin/content/faq', { credentials: 'include' })
        
        // Mock data
        setTimeout(() => {
          setFaqs([
            {
              id: 'faq-1',
              title: 'Как быстро одобряется заявка?',
              slug: 'kak-bystro-odobryaetsya-zayavka',
              status: 'published',
              createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'faq-2',
              title: 'Какие документы нужны?',
              slug: 'kakie-dokumenty-nuzhny',
              status: 'published',
              createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
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
    router.push('/m/content/faq/new')
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="FAQ" />
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
        <AdminHeader title="FAQ" />
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
      <AdminHeader title="FAQ" />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">FAQ</h1>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить новый вопрос
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>FAQ</CardTitle>
            </CardHeader>
            <CardContent>
              {faqs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Нет вопросов
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Вопрос</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Обновлено</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faqs.map((faq) => (
                      <TableRow
                        key={faq.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/m/content/faq/${faq.id}`)}>
                        <TableCell className="font-medium">{faq.title}</TableCell>
                        <TableCell className="text-muted-foreground">{faq.slug}</TableCell>
                        <TableCell>
                          <Badge variant={faq.status === 'published' ? 'default' : 'secondary'}>
                            {faq.status === 'published' ? 'Опубликовано' : 'Черновик'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(faq.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(faq.updatedAt)}
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


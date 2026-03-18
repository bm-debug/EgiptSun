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
import { Loader2, Plus, ExternalLink } from 'lucide-react'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import { useRouter } from 'next/navigation'
import { altrpText } from '@/shared/types/altrp'
import { formatDate } from '@/shared/utils/date-format'

interface BlogPost {
  id: number
  taid: string
  title: string | null
  statusName: string | null
  category: string | null
  createdAt: Date | null
  updatedAt: Date | null
  dataIn: { slug: string } | null
}

export default function AdminBlogPageClient() {
  const router = useRouter()
  const [blogPosts, setBlogPosts] = React.useState<BlogPost[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetchContent()
  }, [])

  const fetchContent = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/altrp/v1/admin/content/blog', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch blog posts')
      }

      const data = await response.json() as { docs: altrpText[]; pagination: any }
      const posts: BlogPost[] = data.docs.map((post) => ({
        id: post.id,
        taid: post.taid || '',
        title: post.title,
        statusName: post.statusName,
        category: post.category,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        dataIn: post.dataIn || null,
      }))
      
      setBlogPosts(posts)
    } catch (err) {
      console.error('Content fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    router.push('/m/content/blog/new')
  }

  const getStatusBadge = (statusName: string | null) => {
    switch (statusName) {
      case 'PUBLISHED':
        return <Badge variant="default">Опубликовано</Badge>
      case 'ON_APPROVAL':
        return <Badge variant="secondary">На утверждении</Badge>
      case 'DRAFT':
      default:
        return <Badge variant="outline">Черновик</Badge>
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Блог" />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
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
        <AdminHeader title="Блог" />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Блог" />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Статьи блога</h1>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить новую статью
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Статьи блога</CardTitle>
            </CardHeader>
            <CardContent>
              {blogPosts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Нет статей
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Обновлено</TableHead>
                      <TableHead>Публичная страница</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blogPosts.map((post) => {
                      const publicUrl = post.statusName === 'PUBLISHED' && post.dataIn?.slug 
                        ? `/blog/${post.dataIn.slug}` 
                        : null
                      
                      return (
                        <TableRow
                          key={post.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/m/content/blog/${post.taid}`)}>
                          <TableCell className="font-medium">{post.title || 'Без названия'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {post.dataIn?.slug || '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(post.statusName)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {post.category || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(post.createdAt || '')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(post.updatedAt || '')}
                          </TableCell>
                          <TableCell>
                            {publicUrl ? (
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Открыть
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
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


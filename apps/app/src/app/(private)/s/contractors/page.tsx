'use client'

import React, { useEffect, useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'

const PAGE_SIZE = 20

type Contractor = {
  id: number
  uuid: string | null
  caid: string | null
  title: string | null
  cityName: string | null
  mediaId: string | null
  dataIn: {
    country?: string
    city?: string
    representative?: string
    contact_person?: string
    phone?: string
    telephone?: string
    email?: string
    logo?: string
    image?: string
    [key: string]: any
  } | null
}

type ApiResponse = {
  docs: Contractor[]
  totalPages: number
  page: number
  totalDocs: number
}

export default function Page() {
  const searchParams = useSearchParams()
  const pageParam = searchParams.get('page')
  const page = Math.max(parseInt(pageParam || '1', 10) || 1, 1)
  
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/store/v2/s/contractors?page=${page}&limit=${PAGE_SIZE}`, {
          credentials: 'include',
        })
        
        const body = await response.json() as { error?: string }

        if (!response.ok) {
          throw new Error((body?.error || response.status || 'Неизвестная ошибка') as string)
        }
        
        setData(body as ApiResponse)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [page])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center text-red-500">Ошибка: {error}</div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const totalPages = data.totalPages || 1
  const basePath = '/s/contractors'
  const rowOffset = (page - 1) * PAGE_SIZE

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">№</TableHead>
              <TableHead className="w-20">Logo</TableHead>
              <TableHead>Заголовок</TableHead>
              <TableHead>Страна</TableHead>
              <TableHead>Город</TableHead>
              <TableHead>Representative</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Электронная почта</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.docs.map((doc, idx) => {
              const displayIndex = rowOffset + idx + 1

              const title = doc.title || '-'
              const country = doc.dataIn?.country || '-'
              const city = doc.cityName || doc.dataIn?.city || '-'
              const representative = doc.dataIn?.representative || doc.dataIn?.contact_person || '-'
              const phone = doc.dataIn?.phone || doc.dataIn?.telephone || '-'
              const email = doc.dataIn?.email || '-'

              // Logo из mediaId или dataIn
              const logoUrl = doc.dataIn?.logo || doc.dataIn?.image || null
              const rowKey = doc.uuid || doc.caid || `row-${doc.id ?? displayIndex}`

              return (
                <TableRow key={rowKey}>
                  <TableCell>{displayIndex}</TableCell>
                  <TableCell>
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={title}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{title}</TableCell>
                  <TableCell>{country}</TableCell>
                  <TableCell>{city}</TableCell>
                  <TableCell>{representative}</TableCell>
                  <TableCell>{phone}</TableCell>
                  <TableCell>{email}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={page <= 1}
                href={page > 1 ? `${basePath}?page=${page - 1}` : undefined}
              />
            </PaginationItem>

            {page - 1 > 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {page > 1 && (
              <PaginationItem>
                <PaginationLink href={`${basePath}?page=${page - 1}`}>{page - 1}</PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationLink href={`${basePath}?page=${page}`} isActive>
                {page}
              </PaginationLink>
            </PaginationItem>

            {page < totalPages && (
              <PaginationItem>
                <PaginationLink href={`${basePath}?page=${page + 1}`}>{page + 1}</PaginationLink>
              </PaginationItem>
            )}

            {page + 1 < totalPages && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                aria-disabled={page >= totalPages}
                href={page < totalPages ? `${basePath}?page=${page + 1}` : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}


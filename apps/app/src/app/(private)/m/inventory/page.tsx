'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { ImageIcon, Loader2, Plus } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { ManagerAddInventoryToLocation } from '@/packages/components/blocks-app/m/ManagerAddInventoryToLocation'
import qs from 'qs'

const PAGE_SIZE = 20

type Product = {
  id: number
  uuid: string
  paid: string
  title: string | null
  category: string | null
  type: string | null
  statusName: string | null
  isPublic: boolean | null
  dataIn: {
    sku?: string
    category?: string
    image?: string
    thumbnail?: string
    [key: string]: any
  } | null
  inventory?: {
    available: number
    in_transporting: number
    unavailable: number
    commited: number
  }
}

type ApiResponse = {
  docs: Product[]
  totalPages: number
  page: number
  totalDocs: number
}

type Location = {
  laid: string
  title: string
  city?: string | null
  type?: string | null
}

export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pageParam = searchParams.get('page')
  const page = Math.max(parseInt(pageParam || '1', 10) || 1, 1)
  
  // Parse selected locations from query params using qs
  const selectedLocations = useMemo(() => {
    const queryString = searchParams.toString()
    if (!queryString) return []
    const parsed = qs.parse(queryString)
    if (Array.isArray(parsed.location)) {
      return parsed.location as string[]
    } else if (typeof parsed.location === 'string') {
      return [parsed.location]
    }
    return []
  }, [searchParams])
  
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)

  // Fetch locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/store/v2/m/locations', {
          credentials: 'include',
        })
        const body = await response.json() as { locations?: Location[] }
        if (response.ok && body.locations) {
          setLocations(body.locations)
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err)
      } finally {
        setLocationsLoading(false)
      }
    }
    fetchLocations()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Build query string with qs
        const queryParams = qs.stringify({
          page,
          limit: PAGE_SIZE,
          withInventory: true,
          location: selectedLocations.length > 0 ? selectedLocations : undefined,
        }, { arrayFormat: 'brackets' })
        
        const response = await fetch(`/api/store/v2/m/products?${queryParams}`, {
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
  }, [page, selectedLocations])

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
  const basePath = '/m/inventory'
  const rowOffset = (page - 1) * PAGE_SIZE

  const handleAddSuccess = () => {
    // Reload data after adding inventory
    window.location.reload()
  }

  const handleLocationToggle = (location: string) => {
    let newSelectedLocations: string[]
    
    if (selectedLocations.includes(location)) {
      // Remove location
      newSelectedLocations = selectedLocations.filter(l => l !== location)
    } else {
      // Add location
      newSelectedLocations = [...selectedLocations, location]
    }
    
    // Build new query string with qs
    const queryString = qs.stringify({
      page: 1, // Reset to first page when filtering
      location: newSelectedLocations.length > 0 ? newSelectedLocations : undefined,
    }, { arrayFormat: 'brackets' })
    
    // Use replace to avoid page reload
    router.replace(`/m/inventory?${queryString}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Инвентаризация</h1>
          <p className="text-sm text-muted-foreground">
            Управление товарами на складе
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Добавить на склад
        </Button>
      </div>

      {/* Location Filter Buttons */}
      {!locationsLoading && locations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {locations.map((loc) => (
            <Button
              key={loc.laid}
              variant={selectedLocations.includes(loc.laid) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLocationToggle(loc.laid)}
            >
              {loc.title}
            </Button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">№</TableHead>
              <TableHead className="w-20">Изобр.</TableHead>
              <TableHead>Заголовок</TableHead>
              <TableHead className="text-right">Доступно</TableHead>
              <TableHead className="text-right">В перевозке</TableHead>
              <TableHead className="text-right">Недоступно</TableHead>
              <TableHead className="text-right">Зарезервировано</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.docs.map((doc, idx) => {
              const displayIndex = rowOffset + idx + 1

              // title
              const titleText = doc.title || doc.dataIn?.sku || doc.paid || '-'

              // изображение из dataIn
              const imageUrl = doc.dataIn?.image || doc.dataIn?.thumbnail || null

              // количества из inventory
              const available = doc.inventory?.available ?? 0
              const inTransporting = doc.inventory?.in_transporting ?? 0
              const unavailable = doc.inventory?.unavailable ?? 0
              const commited = doc.inventory?.commited ?? 0

              return (
                <TableRow key={doc.id}>
                  <TableCell>{displayIndex}</TableCell>
                  <TableCell>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={titleText}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{titleText}</TableCell>
                  <TableCell className="text-right">{available}</TableCell>
                  <TableCell className="text-right">{inTransporting}</TableCell>
                  <TableCell className="text-right">{unavailable}</TableCell>
                  <TableCell className="text-right">{commited}</TableCell>
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

      {/* Add Inventory Dialog */}
      <ManagerAddInventoryToLocation
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
        selectedLocations={selectedLocations}
      />
    </div>
  )
}


'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { ImageIcon, Loader2, Plus, Edit, Trash2 } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ManagerProductForm } from '@/packages/components/blocks-app/m/ManagerProductForm'
import { ManagerDeleteProduct } from '@/packages/components/blocks-app/m/ManagerDeleteProduct'
import qs from 'qs'
import { DbFilters } from '@/shared/types/shared'

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
    warehouse_laid?: string
    price?: number
    reduced_limit?: number
    [key: string]: any
  } | null
}

type ApiResponse = {
  docs: Product[]
  totalPages: number
  page: number
  totalDocs: number
}

type Category = {
  name: string
  title: string
}

type Status = {
  name: string
  title: string
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
  
  // Parse filters from query params
  const selectedCategory = searchParams.get('category') || ''
  const selectedStatus = searchParams.get('status') || ''
  const selectedLocation = searchParams.get('location') || ''
  const searchQuery = searchParams.get('search') || ''
  
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  const [categories, setCategories] = useState<Category[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [statusesLoading, setStatusesLoading] = useState(true)
  const [locationsLoading, setLocationsLoading] = useState(true)
  
  const [searchInput, setSearchInput] = useState(searchQuery)

  // Map category and status names to titles
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach(cat => map.set(cat.name, cat.title))
    return map
  }, [categories])

  const statusMap = useMemo(() => {
    const map = new Map<string, string>()
    statuses.forEach(status => map.set(status.name, status.title))
    return map
  }, [statuses])

  const locationMap = useMemo(() => {
    const map = new Map<string, string>()
    locations.forEach(loc => map.set(loc.laid, loc.title))
    return map
  }, [locations])

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true)
      try {
        
      const queryParams = qs.stringify({
        entity: 'products',
        limit: 1000,
        filters: {
          conditions: [
            {
              field: 'name',
              operator: 'exclude',
              values: [
                'ARCHIEVED', 
                'CANCELLED',
                'ON_PAUSE',
                'COMPLETED',
                'ACTIVE',
                'IN_PROGRESS',
                'ON_APPROVAL',
              ],
            },
          ],
        } as DbFilters,
      }, { arrayFormat: 'brackets' })
        const response = await fetch(`/api/store/v2/m/taxonomy?${queryParams}`, {
          credentials: 'include',
        })
        const body = await response.json() as { error?: string }
        if (response.ok) {
          const result = body as { docs: Category[] }
          setCategories(result.docs || [])
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      } finally {
        setCategoriesLoading(false)
      }
    }
    fetchCategories()
  }, [])

  // Fetch statuses
  useEffect(() => {
    const fetchStatuses = async () => {
      setStatusesLoading(true)
      const queryParams = qs.stringify({
        entity: 'products',
        limit: 1000,
        filters: {
          conditions: [
            {
              field: 'name',
              operator: 'exclude',
              values: [
                'ARCHIEVED', 
                'CANCELLED',
                'ON_PAUSE',
                'COMPLETED',
                'ACTIVE',
                'IN_PROGRESS',
                'ON_APPROVAL',
              ],
            },
          ],
        } as DbFilters,
      }, { arrayFormat: 'brackets' })
      try {
        const response = await fetch(`/api/store/v2/m/taxonomy?${queryParams}`, {
          credentials: 'include',
        })
        const body = await response.json() as { error?: string }
        if (response.ok) {
          const result = body as { docs: Status[] }
          setStatuses(result.docs || [])
        }
      } catch (err) {
        console.error('Failed to fetch statuses:', err)
      } finally {
        setStatusesLoading(false)
      }
    }
    fetchStatuses()
  }, [])

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      setLocationsLoading(true)
      try {
        const response = await fetch('/api/store/v2/m/locations', {
          credentials: 'include',
        })
        const body = await response.json() as { error?: string }
        if (response.ok && (body as any).locations) {
          setLocations((body as any).locations)
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err)
      } finally {
        setLocationsLoading(false)
      }
    }
    fetchLocations()
  }, [])

  // Function to fetch products data
  const fetchProductsData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = qs.stringify({
        page,
        limit: PAGE_SIZE,
        category: selectedCategory || undefined,
        statusName: selectedStatus || undefined,
        'data_in.warehouse_laid': selectedLocation || undefined,
        search: searchQuery || undefined,
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
  }, [page, selectedCategory, selectedStatus, selectedLocation, searchQuery])

  // Fetch products
  useEffect(() => {
    fetchProductsData()
  }, [fetchProductsData])

  const handleSuccess = () => {
    // Reload only the table data
    fetchProductsData()
  }

  const handleFilterChange = (filterName: string, value: string) => {
    const queryString = qs.stringify({
      page: 1, // Reset to first page when filtering
      category: filterName === 'category' ? value : selectedCategory || undefined,
      status: filterName === 'status' ? value : selectedStatus || undefined,
      location: filterName === 'location' ? value : selectedLocation || undefined,
      search: filterName === 'search' ? value : searchQuery || undefined,
    }, { arrayFormat: 'brackets' })
    
    router.replace(`/m/products?${queryString}`, { scroll: false })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleFilterChange('search', searchInput)
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setEditDialogOpen(true)
  }

  const handleDelete = (product: Product) => {
    setSelectedProduct(product)
    setDeleteDialogOpen(true)
  }

  if (loading && !data) {
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
  const basePath = '/m/products'
  const rowOffset = (page - 1) * PAGE_SIZE

  const buildPaginationUrl = (newPage: number) => {
    const queryString = qs.stringify({
      page: newPage,
      category: selectedCategory || undefined,
      status: selectedStatus || undefined,
      location: selectedLocation || undefined,
      search: searchQuery || undefined,
    }, { arrayFormat: 'brackets' })
    return `${basePath}?${queryString}`
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Товары</h1>
          <p className="text-sm text-muted-foreground">
            Управление каталогом товаров
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Добавить товар
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="sm:col-span-2">
          <Input
            type="text"
            placeholder="Поиск по названию..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full"
          />
        </form>

        {/* Category filter */}
        <Select 
          value={selectedCategory || 'all'} 
          onValueChange={(value) => handleFilterChange('category', value === 'all' ? '' : value)}
          disabled={categoriesLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.name} value={category.name}>
                {category.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select 
          value={selectedStatus || 'all'} 
          onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
          disabled={statusesLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status.name} value={status.name}>
                {status.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Location filter */}
        <Select 
          value={selectedLocation || 'all'} 
          onValueChange={(value) => handleFilterChange('location', value === 'all' ? '' : value)}
          disabled={locationsLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Все склады" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все склады</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.laid} value={location.laid}>
                {location.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">№</TableHead>
              <TableHead className="w-20">Изобр.</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Склад</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-24 text-center">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Товары не найдены
                </TableCell>
              </TableRow>
            ) : (
              data.docs.map((doc, idx) => {
                const displayIndex = rowOffset + idx + 1

                // title
                const titleText = doc.title || doc.dataIn?.sku || doc.paid || '-'

                // изображение из dataIn
                const imageUrl = doc.dataIn?.image || doc.dataIn?.thumbnail || null

                // Get readable names
                const categoryTitle = doc.category ? (categoryMap.get(doc.category) || doc.category) : '-'
                const statusTitle = doc.statusName ? (statusMap.get(doc.statusName) || doc.statusName) : '-'
                const locationTitle = doc.dataIn?.warehouse_laid ? (locationMap.get(doc.dataIn.warehouse_laid) || doc.dataIn.warehouse_laid) : '-'

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
                    <TableCell>{categoryTitle}</TableCell>
                    <TableCell>{locationTitle}</TableCell>
                    <TableCell>{statusTitle}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(doc)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={page <= 1}
                href={page > 1 ? buildPaginationUrl(page - 1) : undefined}
              />
            </PaginationItem>

            {page - 1 > 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {page > 1 && (
              <PaginationItem>
                <PaginationLink href={buildPaginationUrl(page - 1)}>{page - 1}</PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationLink href={buildPaginationUrl(page)} isActive>
                {page}
              </PaginationLink>
            </PaginationItem>

            {page < totalPages && (
              <PaginationItem>
                <PaginationLink href={buildPaginationUrl(page + 1)}>{page + 1}</PaginationLink>
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
                href={page < totalPages ? buildPaginationUrl(page + 1) : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Add Product Dialog */}
      <ManagerProductForm
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Edit Product Dialog */}
      <ManagerProductForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleSuccess}
        product={selectedProduct}
      />

      {/* Delete Product Dialog */}
      <ManagerDeleteProduct
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleSuccess}
        productPaid={selectedProduct?.paid || null}
        productTitle={selectedProduct?.title || null}
      />
    </div>
  )
}
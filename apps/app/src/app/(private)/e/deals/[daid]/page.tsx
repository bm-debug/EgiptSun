"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Package, Calendar, CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AppSidebar as EditorSidebar } from "@/packages/components/blocks-app/admin/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface DealProduct {
  id: number
  productPaid: string
  productTitle: string
  quantity: number
  price: number
  total: number
}

interface Deal {
  id: number
  uuid: string
  daid: string
  fullDaid: string
  clientAid: string
  clientName?: string
  title: string
  statusName: string
  createdAt: string
  updatedAt: string
  dataIn: {
    total?: number
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    deliveryAddress?: string
    paymentMethod?: string
    notes?: string
    delivery?: number
    deliveryPrice?: number
    name?: string
    email?: string
    phone?: string
    address?: string
    [key: string]: any
  }
  products: DealProduct[]
}

export default function DealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const daid = params?.daid as string
  
  console.log('DealDetailPage rendered, params:', params, 'daid:', daid)
  
  const [deal, setDeal] = React.useState<Deal | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    console.log('DealDetailPage useEffect triggered, daid:', daid, 'params:', params)
    
    if (!daid) {
      console.error('No daid found in params')
      setError('Deal ID is required')
      setLoading(false)
      return
    }

    console.log('Starting to fetch deal with daid:', daid)

    const fetchDeal = async () => {
      try {
        console.log('fetchDeal function called')
        setLoading(true)
        setError(null)
        
        // Try to fetch deal by daid first
        const daidUrl = `/api/admin/state?c=deals&ps=1&filters[0][field]=daid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(daid)}`
        console.log('Fetching deal by daid:', daidUrl)
        console.log('About to make fetch request...')
        let dealResponse = await fetch(daidUrl, {
          credentials: 'include',
        })
        
        let dealData: { data?: any[] } | null = null
        
        if (dealResponse.ok) {
          dealData = await dealResponse.json() as { data?: any[] }
          console.log('Deal data by daid:', dealData)
          
          // If found by daid, use it
          if (dealData.data && dealData.data.length > 0) {
            const dealRecord = dealData.data[0]
            
            // Parse dataIn if it's a string
            let dataIn = dealRecord.dataIn || dealRecord.data_in || {}
            if (typeof dataIn === 'string') {
              try {
                dataIn = JSON.parse(dataIn)
              } catch {
                dataIn = {}
              }
            }
            console.log('Parsed dataIn:', dataIn)
            
            // Fetch client name if clientAid exists
            let clientName: string | undefined = undefined
            const clientAid = dealRecord.client_aid || dealRecord.clientAid
            console.log('Looking for client with clientAid:', clientAid)
            if (clientAid) {
              try {
                // Try to find in humans table first (client_aid might be haid)
                const humanUrl = `/api/admin/state?c=humans&ps=1&filters[0][field]=haid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(clientAid)}`
                console.log('Fetching human:', humanUrl)
                const humanResponse = await fetch(humanUrl, {
                  credentials: 'include',
                })
                if (humanResponse.ok) {
                  const humanData = await humanResponse.json() as { data?: any[] }
                  console.log('Human data:', humanData)
                  if (humanData.data && humanData.data.length > 0) {
                    clientName = humanData.data[0].full_name || humanData.data[0].name || humanData.data[0].title
                    console.log('Found client name from humans:', clientName)
                  }
                }
                
                // If not found in humans, try contractors
                if (!clientName) {
                  const contractorUrl = `/api/admin/state?c=contractors&ps=1&filters[0][field]=caid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(clientAid)}`
                  console.log('Fetching contractor:', contractorUrl)
                  const clientResponse = await fetch(contractorUrl, {
                    credentials: 'include',
                  })
                  if (clientResponse.ok) {
                    const clientData = await clientResponse.json() as { data?: any[] }
                    console.log('Contractor data:', clientData)
                    if (clientData.data && clientData.data.length > 0) {
                      clientName = clientData.data[0].title || clientData.data[0].name
                      console.log('Found client name from contractors:', clientName)
                    }
                  }
                }
              } catch (err) {
                console.error('Failed to fetch client:', err)
              }
            }
            
            // Fetch deal products
            const fullDaidToSearch = dealRecord.full_daid || dealRecord.fullDaid || daid
            const productsResponse = await fetch(`/api/admin/state?c=deal_products&ps=100&filters[0][field]=full_daid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(fullDaidToSearch)}`, {
              credentials: 'include',
            })
            let products: DealProduct[] = []
            
            if (productsResponse.ok) {
              const productsData = await productsResponse.json() as { data?: any[] }
              
              // Fetch product details for each product
              const productPromises = (productsData.data || []).map(async (p: any) => {
                let dataIn = p.dataIn || p.data_in || {}
                if (typeof dataIn === 'string') {
                  try {
                    dataIn = JSON.parse(dataIn)
                  } catch {
                    dataIn = {}
                  }
                }
                
                const fullPaid = p.full_paid || p.fullPaid || ''
                const productPaid = fullPaid.split('.').pop() || fullPaid
                
                // Fetch product title from products table
                let productTitle = dataIn.productTitle || dataIn.product_title || productPaid || 'Unknown'
                try {
                  const productResponse = await fetch(`/api/admin/state?c=products&ps=1&filters[0][field]=paid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(productPaid)}`, {
                    credentials: 'include',
                  })
                  if (productResponse.ok) {
                    const productData = await productResponse.json() as { data?: any[] }
                    if (productData.data && productData.data.length > 0) {
                      const title = productData.data[0].title
                      // Handle title as object with translations (e.g., {ru: "..."}) or string
                      if (typeof title === 'object' && title !== null) {
                        productTitle = title.ru || title.en || Object.values(title)[0] || productTitle
                      } else if (typeof title === 'string') {
                        productTitle = title
                      }
                    }
                  }
                } catch (err) {
                  console.error('Failed to fetch product:', err)
                }
                
                // Prices are stored in cents, divide by 100
                const price = Number(dataIn.price || 0) / 100
                const quantity = Number(p.quantity || 0)
                
                return {
                  id: p.id,
                  productPaid: productPaid,
                  productTitle: productTitle,
                  quantity: quantity,
                  price: price,
                  total: quantity * price,
                }
              })
              
              products = await Promise.all(productPromises)
            }
            
            setDeal({
              id: dealRecord.id,
              uuid: dealRecord.uuid,
              daid: dealRecord.daid,
              fullDaid: dealRecord.full_daid || dealRecord.fullDaid || '',
              clientAid: dealRecord.client_aid || dealRecord.clientAid || '',
              clientName: clientName,
              title: dealRecord.title || '',
              statusName: dealRecord.status_name || dealRecord.statusName || '',
              createdAt: dealRecord.created_at || dealRecord.createdAt || '',
              updatedAt: dealRecord.updated_at || dealRecord.updatedAt || '',
              dataIn,
              products,
            })
            setLoading(false)
            return
          }
        } else {
          const errorText = await dealResponse.text()
          console.error('Failed to fetch deal by daid:', dealResponse.status, errorText)
        }
        
        // If not found by daid, try by full_daid
        const fullDaidUrl = `/api/admin/state?c=deals&ps=1&filters[0][field]=full_daid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(daid)}`
        console.log('Fetching deal by full_daid:', fullDaidUrl)
        dealResponse = await fetch(fullDaidUrl, {
          credentials: 'include',
        })
        
        if (!dealResponse.ok) {
          const errorText = await dealResponse.text()
          console.error('Failed to fetch deal by full_daid:', dealResponse.status, errorText)
          throw new Error(`Failed to fetch deal: ${dealResponse.status} - ${errorText}`)
        }
        
        dealData = await dealResponse.json() as { data?: any[] }
        console.log('Deal data by full_daid:', dealData)
        
        if (!dealData.data || dealData.data.length === 0) {
          throw new Error(`Deal not found with ID: ${daid}`)
        }
        
        const dealRecord = dealData.data[0]
        
        // Parse dataIn if it's a string
        let dataIn = dealRecord.dataIn || dealRecord.data_in || {}
        if (typeof dataIn === 'string') {
          try {
            dataIn = JSON.parse(dataIn)
          } catch {
            dataIn = {}
          }
        }
        console.log('Parsed dataIn:', dataIn)
        
        // Fetch client name if clientAid exists
        let clientName: string | undefined = undefined
        const clientAid = dealRecord.client_aid || dealRecord.clientAid
        console.log('Looking for client with clientAid:', clientAid)
        if (clientAid) {
          try {
            // Try to find in humans table first (client_aid might be haid)
            const humanUrl = `/api/admin/state?c=humans&ps=1&filters[0][field]=haid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(clientAid)}`
            console.log('Fetching human:', humanUrl)
            const humanResponse = await fetch(humanUrl, {
              credentials: 'include',
            })
            if (humanResponse.ok) {
              const humanData = await humanResponse.json() as { data?: any[] }
              console.log('Human data:', humanData)
              if (humanData.data && humanData.data.length > 0) {
                clientName = humanData.data[0].full_name || humanData.data[0].name || humanData.data[0].title
                console.log('Found client name from humans:', clientName)
              }
            }
            
            // If not found in humans, try contractors
            if (!clientName) {
              const contractorUrl = `/api/admin/state?c=contractors&ps=1&filters[0][field]=caid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(clientAid)}`
              console.log('Fetching contractor:', contractorUrl)
              const clientResponse = await fetch(contractorUrl, {
                credentials: 'include',
              })
              if (clientResponse.ok) {
                const clientData = await clientResponse.json() as { data?: any[] }
                console.log('Contractor data:', clientData)
                if (clientData.data && clientData.data.length > 0) {
                  clientName = clientData.data[0].title || clientData.data[0].name
                  console.log('Found client name from contractors:', clientName)
                }
              }
            }
          } catch (err) {
            console.error('Failed to fetch client:', err)
          }
        }
        
        // Fetch deal products using state API with filter by full_daid
        // full_daid in deal_products should match daid in deals (or full_daid if available)
        const fullDaidToSearch = dealRecord.full_daid || dealRecord.fullDaid || daid
        const productsResponse = await fetch(`/api/admin/state?c=deal_products&ps=100&filters[0][field]=full_daid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(fullDaidToSearch)}`, {
          credentials: 'include',
        })
        let products: DealProduct[] = []
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json() as { data?: any[] }
          
          // Fetch product details for each product
          const productPromises = (productsData.data || []).map(async (p: any) => {
            // Parse dataIn if needed
            let dataIn = p.dataIn || p.data_in || {}
            if (typeof dataIn === 'string') {
              try {
                dataIn = JSON.parse(dataIn)
              } catch {
                dataIn = {}
              }
            }
            
            // Extract full_paid to get product_paid
            const fullPaid = p.full_paid || p.fullPaid || ''
            const productPaid = fullPaid.split('.').pop() || fullPaid
            
            // Fetch product title from products table
            let productTitle = dataIn.productTitle || dataIn.product_title || productPaid || 'Unknown'
            try {
              const productResponse = await fetch(`/api/admin/state?c=products&ps=1&filters[0][field]=paid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(productPaid)}`, {
                credentials: 'include',
              })
              if (productResponse.ok) {
                const productData = await productResponse.json() as { data?: any[] }
                if (productData.data && productData.data.length > 0) {
                  const title = productData.data[0].title
                  // Handle title as object with translations (e.g., {ru: "..."}) or string
                  if (typeof title === 'object' && title !== null) {
                    productTitle = title.ru || title.en || Object.values(title)[0] || productTitle
                  } else if (typeof title === 'string') {
                    productTitle = title
                  }
                }
              }
            } catch (err) {
              console.error('Failed to fetch product:', err)
            }
            
            // Prices are stored in cents, divide by 100
            const price = Number(dataIn.price || 0) / 100
            const quantity = Number(p.quantity || 0)
            
            return {
              id: p.id,
              productPaid: productPaid,
              productTitle: productTitle,
              quantity: quantity,
              price: price,
              total: quantity * price,
            }
          })
          
          products = await Promise.all(productPromises)
        }
        
        setDeal({
          id: dealRecord.id,
          uuid: dealRecord.uuid,
          daid: dealRecord.daid,
          fullDaid: dealRecord.full_daid || dealRecord.fullDaid || '',
          clientAid: dealRecord.client_aid || dealRecord.clientAid || '',
          clientName: clientName,
          title: dealRecord.title || '',
          statusName: dealRecord.status_name || dealRecord.statusName || '',
          createdAt: dealRecord.created_at || dealRecord.createdAt || '',
          updatedAt: dealRecord.updated_at || dealRecord.updatedAt || '',
          dataIn,
          products,
        })
      } catch (err) {
        console.error('Error fetching deal:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDeal()
  }, [daid, params])

  if (loading) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <SidebarProvider>
          <EditorSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/editor">
                      Editor Panel
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/editor?c=deals">
                      Заказы
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Загрузка...</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Загрузка заказа...</p>
                </div>
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <SidebarProvider>
          <EditorSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/editor">
                      Editor Panel
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/editor?c=deals">
                      Заказы
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Ошибка</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle className="text-destructive">Ошибка</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {error || 'Заказ не найден'}
                    </p>
                    <Button onClick={() => router.back()} variant="outline">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Назад
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('ru-RU')
    } catch {
      return dateString
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(price)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider>
        <EditorSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/editor">
                    Editor Panel
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/editor?c=deals">
                    Заказы
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Заказ {deal.daid}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="container mx-auto max-w-7xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Button onClick={() => router.push('/editor?c=deals&p=1&ps=20')} variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-3xl font-bold">Заказ {deal.daid}</h1>
                    <p className="text-muted-foreground">
                      {deal.fullDaid && `Полный ID: ${deal.fullDaid}`}
                    </p>
                  </div>
                </div>
                {deal.statusName && (
                  <Badge variant={deal.statusName === 'COMPLETED' ? 'default' : 'secondary'}>
                    {deal.statusName}
                  </Badge>
                )}
              </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Информация о клиенте
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(deal.clientName || deal.dataIn.customerName || deal.dataIn.name) && (
              <div>
                <p className="text-sm text-muted-foreground">Имя</p>
                <p className="font-medium">{deal.clientName || deal.dataIn.customerName || deal.dataIn.name}</p>
              </div>
            )}
            {(deal.dataIn.customerEmail || deal.dataIn.email) && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{deal.dataIn.customerEmail || deal.dataIn.email}</p>
              </div>
            )}
            {(deal.dataIn.customerPhone || deal.dataIn.phone) && (
              <div>
                <p className="text-sm text-muted-foreground">Телефон</p>
                <p className="font-medium">{deal.dataIn.customerPhone || deal.dataIn.phone}</p>
              </div>
            )}
            {(deal.dataIn.deliveryAddress || deal.dataIn.address) && (
              <div>
                <p className="text-sm text-muted-foreground">Адрес доставки</p>
                <p className="font-medium">{deal.dataIn.deliveryAddress || deal.dataIn.address}</p>
              </div>
            )}
            {deal.clientAid && (
              <div>
                <p className="text-sm text-muted-foreground">Client AID</p>
                <p className="font-mono text-sm">{deal.clientAid}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Информация о заказе
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Дата создания</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(deal.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Последнее обновление</p>
              <p className="font-medium">{formatDate(deal.updatedAt)}</p>
            </div>
            {deal.dataIn.paymentMethod && (
              <div>
                <p className="text-sm text-muted-foreground">Способ оплаты</p>
                <p className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {deal.dataIn.paymentMethod === 'cash' 
                    ? 'Наличными при получении' 
                    : deal.dataIn.paymentMethod === 'card'
                    ? 'Картой'
                    : deal.dataIn.paymentMethod}
                </p>
              </div>
            )}
            {deal.dataIn.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Примечания</p>
                <p className="font-medium">{deal.dataIn.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Товары в заказе</CardTitle>
        </CardHeader>
        <CardContent>
          {deal.products.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Код товара</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead className="text-right">Количество</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deal.products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.productPaid}</TableCell>
                      <TableCell>{product.productTitle}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right">{formatPrice(product.price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(product.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator className="my-4" />
              <div className="flex justify-end">
                <div className="text-right space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Сумма товаров</p>
                    <p className="font-medium">
                      {formatPrice(deal.products.reduce((sum, p) => sum + p.total, 0))}
                    </p>
                  </div>
                  {deal.dataIn.delivery !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Доставка</p>
                      <p className="font-medium">
                        {deal.dataIn.delivery === 0 || deal.dataIn.deliveryPrice === 0 
                          ? 'Бесплатно' 
                          : formatPrice((deal.dataIn.deliveryPrice || deal.dataIn.delivery || 0) / 100)}
                      </p>
                    </div>
                  )}
                  <div className="my-2">
                    <Separator />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">ИТОГО</p>
                    <p className="text-2xl font-bold">
                      {formatPrice(
                        (deal.dataIn.total ? deal.dataIn.total / 100 : 0) || 
                        (deal.products.reduce((sum, p) => sum + p.total, 0) + 
                        ((deal.dataIn.deliveryPrice || deal.dataIn.delivery || 0) / 100))
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Товары не найдены
            </p>
          )}
        </CardContent>
      </Card>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}


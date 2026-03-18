'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Product {
  id: string
  name: string
  description: string
  minAmount: number
  expectedReturn: number
  term: string
}

export default function InvestorProductsPage() {
  const router = useRouter()
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [kycChecked, setKycChecked] = React.useState(false)
  const [kycVerified, setKycVerified] = React.useState(false)
  const [kycDialogOpen, setKycDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        // TODO: Replace with actual API endpoint
        // const response = await fetch('/api/i/products', { credentials: 'include' })
        
        // Mock data
        setTimeout(() => {
          setProducts([
            {
              id: '1',
              name: 'Консервативный портфель',
              description: 'Низкий риск, стабильный доход',
              minAmount: 100000,
              expectedReturn: 8,
              term: '12 месяцев',
            },
            {
              id: '2',
              name: 'Сбалансированный портфель',
              description: 'Средний риск, оптимальная доходность',
              minAmount: 200000,
              expectedReturn: 12,
              term: '24 месяца',
            },
            {
              id: '3',
              name: 'Агрессивный портфель',
              description: 'Высокий риск, максимальная доходность',
              minAmount: 500000,
              expectedReturn: 18,
              term: '36 месяцев',
            },
          ])
          setLoading(false)
        }, 500)
      } catch (err) {
        console.error('Products fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load products')
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  React.useEffect(() => {
    const checkKycStatus = async () => {
      try {
        const response = await fetch('/api/altrp/v1/me/kyc-status', {
          credentials: 'include',
        })

        if (!response.ok) {
          console.error('Failed to check KYC status')
          return
        }

        const data = await response.json() as { success: boolean; verified: boolean }
        if (data.success) {
          setKycVerified(data.verified)
          setKycChecked(true)
        }
      } catch (err) {
        console.error('KYC status check error:', err)
      }
    }

    checkKycStatus()
  }, [])

  const handleInvest = async (productId: string) => {
    // Check KYC status before allowing investment
    if (!kycChecked) {
      // Wait for KYC check to complete
      try {
        const response = await fetch('/api/altrp/v1/me/kyc-status', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json() as { success: boolean; verified: boolean }
          setKycVerified(data.verified)
          setKycChecked(true)
          
          if (!data.verified) {
            setKycDialogOpen(true)
            return
          }
        }
      } catch (err) {
        console.error('KYC status check error:', err)
        setError('Не удалось проверить статус верификации')
        return
      }
    }

    if (!kycVerified) {
      setKycDialogOpen(true)
      return
    }

    // TODO: Navigate to investment form or open dialog
    console.log('Invest in product:', productId)
  }

  const handleKycDialogConfirm = () => {
    setKycDialogOpen(false)
    router.push('/i/profile?tab=kyc')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Продукты</h1>

      {!kycVerified && kycChecked && (
        <Alert>
          <AlertDescription>
            Для начала инвестирования необходимо пройти верификацию личности. 
            <Button 
              variant="link" 
              className="p-0 h-auto ml-1"
              onClick={() => router.push('/i/profile?tab=kyc')}
            >
              Перейти к верификации
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={kycDialogOpen} onOpenChange={setKycDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Требуется верификация</DialogTitle>
            <DialogDescription>
              Для начала инвестирования необходимо пройти верификацию личности.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKycDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleKycDialogConfirm}>
              Перейти к верификации
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Минимальная сумма:</span>
                <span className="font-medium">{formatCurrency(product.minAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ожидаемая доходность:</span>
                <span className="font-medium">{product.expectedReturn}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Срок:</span>
                <span className="font-medium">{product.term}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => handleInvest(product.id)}>
                Инвестировать
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}


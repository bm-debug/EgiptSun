'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2 } from 'lucide-react'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { altrpSupportChat } from '@/shared/types/altrp-support'
import { useAdminSocketEvent } from '@/packages/components/blocks-app/app-admin/AdminSocketProvider'
import { cn } from '@/lib/utils'
import { useNotice } from '@/packages/components/blocks-app/app-admin/AdminNoticesProvider'
import { useRef, useEffect } from 'react'

interface Operator {
  uuid: string
  humanAid: string | null
  fullName: string | null
}

export default function AdminSupportPageClient() {
  const router = useRouter()
  const [tickets, setTickets] = React.useState<altrpSupportChat[]>([])
  const [operators, setOperators] = React.useState<Operator[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [operatorFilter, setOperatorFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')

  // Base fetch function without loading state (for silent updates)
  const fetchDataBase = React.useCallback(async () => {
    try {
      setError(null)
      
      // Fetch operators (admins) and tickets in parallel
      const [operatorsResponse, ticketsResponse] = await Promise.all([
        fetch('/api/altrp/v1/admin/users/managers', {
          credentials: 'include',
        }),
        fetch('/api/altrp/v1/admin/support?orderBy=updatedAt&orderDirection=desc', {
          credentials: 'include',
        }),
      ])
      
      if (!operatorsResponse.ok) {
        throw new Error('Failed to fetch operators')
      }
      
      if (!ticketsResponse.ok) {
        throw new Error('Failed to fetch support tickets')
      }
      
      const operatorsData = await operatorsResponse.json() as { docs: Array<{
        uuid: string
        humanAid: string | null
        fullName: string | null
      }> }
      
      const ticketsData = await ticketsResponse.json() as { docs: altrpSupportChat[]; pagination: any }
      
      setOperators(operatorsData.docs.map(op => ({
        uuid: op.uuid,
        humanAid: op.humanAid,
        fullName: op.fullName,
      })))
      setTickets(ticketsData.docs)
    } catch (err) {
      console.error('Data fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    }
  }, [])

  // Full fetch function with loading state (for initial load)
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch operators (admins) and tickets in parallel
      const [operatorsResponse, ticketsResponse] = await Promise.all([
        fetch('/api/altrp/v1/admin/users/managers', {
          credentials: 'include',
        }),
        fetch('/api/altrp/v1/admin/support?orderBy=updatedAt&orderDirection=desc', {
          credentials: 'include',
        }),
      ])
      
      if (!operatorsResponse.ok) {
        throw new Error('Failed to fetch operators')
      }
      
      if (!ticketsResponse.ok) {
        throw new Error('Failed to fetch support tickets')
      }
      
      const operatorsData = await operatorsResponse.json() as { docs: Array<{
        uuid: string
        humanAid: string | null
        fullName: string | null
      }> }
      
      const ticketsData = await ticketsResponse.json() as { docs: altrpSupportChat[]; pagination: any }
      
      setOperators(operatorsData.docs.map(op => ({
        uuid: op.uuid,
        humanAid: op.humanAid,
        fullName: op.fullName,
      })))
      setTickets(ticketsData.docs)
    } catch (err) {
      console.error('Data fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Subscribe to support-chat-created event to refresh the table (silent update)
  useAdminSocketEvent('support-chat-created', () => {
    fetchDataBase()
  }, [fetchDataBase])

  // Subscribe to unread support chats count changes and refresh table (silent update)
  const unreadSupportChatsCount = useNotice('unread_support_chats_count')
  const prevCountRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Skip initial render
    if (prevCountRef.current === undefined) {
      prevCountRef.current = unreadSupportChatsCount
      return
    }

    // Only refresh if count actually changed
    if (prevCountRef.current !== unreadSupportChatsCount) {
      prevCountRef.current = unreadSupportChatsCount
      // Use non-loading version for immediate update without changing pagination
      fetchDataBase()
    }
  }, [unreadSupportChatsCount, fetchDataBase])

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return ''
    const date = dateString instanceof Date ? dateString : new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'OPEN':
        return 'default'
      case 'CLOSED':
        return 'outline'
      default:
        return 'secondary'
    }
  }
  
  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'OPEN':
        return 'Открыт'
      case 'CLOSED':
        return 'Закрыт'
      default:
        return status || 'Неизвестно'
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    // Filter by operator
    if (operatorFilter !== 'all' && ticket.dataIn?.managerHaid !== operatorFilter) {
      return false
    }
    
    // Filter by status
    if (statusFilter !== 'all' && ticket.statusName !== statusFilter) {
      return false
    }
    
    return true
  })

  // Get operator name by haid
  const getOperatorName = (haid: string | null | undefined): string => {
    if (!haid) return 'Не назначен'
    const operator = operators.find(op => op.humanAid === haid)
    return operator?.fullName || haid
  }

  // if (loading) {
  //   return (
  //     <>
  //       <AdminHeader title="Поддержка" />
  //       <main className="flex-1 overflow-y-auto">
  //         <div className="flex items-center justify-center py-12">
  //           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  //         </div>
  //       </main>
  //     </>
  //   )
  // }

  if (error) {
    return (
      <>
        <AdminHeader title="Поддержка" />
        <main className="flex-1 overflow-y-auto">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Поддержка" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Поддержка</h1>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Поиск..." className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="OPEN">Открыт</SelectItem>
              <SelectItem value="CLOSED">Закрыт</SelectItem>
            </SelectContent>
          </Select>
          <Select value={operatorFilter} onValueChange={setOperatorFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Оператор" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все операторы</SelectItem>
              {operators.map((operator) => (
                <SelectItem key={operator.humanAid || operator.uuid} value={operator.humanAid || ''}>
                  {operator.fullName || operator.humanAid || 'Без имени'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Тикеты</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTickets.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Нет тикетов
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Тема</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Ответственный оператор</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата создания</TableHead>
                    <TableHead>Последнее обновление</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => {
                    const hasUnread = (ticket as any).hasUnreadMessages === true
                    return (
                      <TableRow
                        key={ticket.id}
                        className={cn('cursor-pointer', hasUnread && 'bg-[var(--primary-light)]')}
                        onClick={() => router.push(`/m/support/${ticket.maid}`)}>
                        <TableCell className={hasUnread ? 'font-bold' : 'font-medium'}>
                          <Link 
                            href={`/m/support/${ticket.maid}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline">
                            {ticket.maid}
                          </Link>
                        </TableCell>
                        <TableCell className={hasUnread ? 'font-bold' : ''}>
                          {ticket.title || 'Без темы'}
                        </TableCell>
                        <TableCell className={hasUnread ? 'font-bold' : ''}>
                          {ticket.dataIn?.humanHaid || 'Неизвестный пользователь'}
                        </TableCell>
                        <TableCell className={hasUnread ? 'font-bold' : ''}>
                          {getOperatorName(ticket.dataIn?.managerHaid)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(ticket.statusName)}>
                            {getStatusLabel(ticket.statusName)}
                          </Badge>
                        </TableCell>
                        <TableCell className={hasUnread ? 'font-bold text-muted-foreground' : 'text-muted-foreground'}>
                          {formatDate(ticket.createdAt)}
                        </TableCell>
                        <TableCell className={hasUnread ? 'font-bold text-muted-foreground' : 'text-muted-foreground'}>
                          {formatDate(ticket.updatedAt)}
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


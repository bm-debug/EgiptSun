'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface Deal {
  id: string
  uuid: string
  title: string
  status: string
  createdAt: string
  dataIn?: any
}

interface RecentDealsProps {
  deals: Deal[]
  formatCurrency: (amount: number) => string
  formatDate: (dateString: string) => string
  getStatusVariant?: (status: string) => 'default' | 'secondary' | 'outline' | 'destructive'
  title?: string
  caption?: string
  emptyMessage?: string
  columnHeaders?: {
    id?: string
    title?: string
    amount?: string
    status?: string
    date?: string
  }
}

export function RecentDeals({ 
  deals, 
  formatCurrency, 
  formatDate, 
  getStatusVariant,
  title = 'Последние заявки',
  caption = 'Список последних заявок',
  emptyMessage = 'Нет заявок',
  columnHeaders = {}
}: RecentDealsProps) {
  const defaultGetStatusVariant = (status: string) => {
    if (status === 'Активна') return 'default'
    if (status === 'Закрыта') return 'secondary'
    return 'outline'
  }

  const statusVariant = getStatusVariant || defaultGetStatusVariant

  const headers = {
    id: columnHeaders.id || 'ID заявки',
    title: columnHeaders.title || 'Название товара',
    amount: columnHeaders.amount || 'Сумма',
    status: columnHeaders.status || 'Статус',
    date: columnHeaders.date || 'Дата',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {deals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <Table>
            <TableCaption>{caption}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{headers.id}</TableHead>
                <TableHead>{headers.title}</TableHead>
                <TableHead>{headers.amount}</TableHead>
                <TableHead>{headers.status}</TableHead>
                <TableHead>{headers.date}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.uuid}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/c/deals/${deal.id}`}
                      className="hover:underline text-primary">
                      {deal.id}
                    </Link>
                  </TableCell>
                  <TableCell>{deal.title}</TableCell>
                  <TableCell>
                    {deal.dataIn?.totalAmount
                      ? formatCurrency(deal.dataIn.totalAmount)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(deal.status)}>
                      {deal.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(deal.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}



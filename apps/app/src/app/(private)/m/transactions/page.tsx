import { Metadata } from 'next'
import AdminTransactionsPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Транзакции',
  description: 'Транзакции',
}

export default async function TransactionsPage() {
  return <AdminTransactionsPageClient />
} 
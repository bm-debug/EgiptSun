import { Metadata } from 'next'
import AdminSupportPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Поддержка Пользователей',
  description: 'Поддержка Пользователей',
}

export default function AdminSupportPage() {
  return <AdminSupportPageClient />
}

import { Metadata } from 'next'
import AdminGuardiansPageClient from './page.client'



export const metadata: Metadata = {
  title: 'Поручители',
  description: 'Поручители',
}

export default function AdminGuardiansPage() {
  return <AdminGuardiansPageClient />
}
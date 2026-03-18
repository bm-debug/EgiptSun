import { Metadata } from 'next'
import AdminSupportPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Administrator Support',
}

export default function AdministratorSupportPage() {
  return <AdminSupportPageClient />
}

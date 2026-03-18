import { Metadata } from 'next'
import AdminSupportPageClient from './page.client'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Developer Support',
}

export default function DeveloperSupportPage() {
  return <AdminSupportPageClient />
}

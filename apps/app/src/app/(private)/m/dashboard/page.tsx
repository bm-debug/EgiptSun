import { Metadata } from "next"
import AdminDashboardPageClient from "./page.client"

export const metadata: Metadata = {
  title: 'Общая сводка::Altrp',
  description: 'Общая сводка::Altrp',
}
export default function AdminDashboardPage() {
  return <AdminDashboardPageClient />
}
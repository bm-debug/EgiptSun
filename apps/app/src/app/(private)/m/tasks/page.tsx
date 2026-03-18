import AdminTasksPageClient from "./page.client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: 'Менеджер задач',
  description: 'Менеджер задач',
}

export default function AdminTasksPage() {
  return <AdminTasksPageClient />
}
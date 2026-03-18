import { Metadata } from "next"
import AdminBlogPageClient from "./page.client"
export const metadata: Metadata = {
  title: 'Блог - Статьи::Altrp',
  description: 'Блог - Статьи::Altrp',
}
export default function BlogPage() {
  return <AdminBlogPageClient />
}
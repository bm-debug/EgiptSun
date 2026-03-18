import type { Metadata } from "next"
import AdminProfilePageClient from "./page.client"

export const metadata: Metadata = {
  title: "Profile",
}

export default function AdminProfilePage() {
  return <AdminProfilePageClient />
}



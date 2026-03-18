import type { Metadata } from "next"
import ManagerProfilePageClient from "./page.client"

export const metadata: Metadata = {
  title: "Profile",
}

export default function ManagerProfilePage() {
  return <ManagerProfilePageClient />
}







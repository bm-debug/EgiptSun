import { redirect } from "next/navigation"

export default function AdminSettingsPage() {
  redirect("/admin?c=settings&p=1")
}








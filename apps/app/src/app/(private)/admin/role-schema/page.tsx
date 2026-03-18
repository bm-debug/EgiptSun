import type { Metadata } from "next"
import RoleSchemaPageClient from "./page.client"

export const metadata: Metadata = {
  title: "Manage Role Schema",
}

export default function RoleSchemaPage() {
  return <RoleSchemaPageClient />
}

import type { Metadata } from "next"
import SqlEditorPageClient from "./page.client"

export const metadata: Metadata = {
  title: "SQL Editor",
}

export default function SqlEditorPage() {
  return <SqlEditorPageClient />
}







import { Metadata } from "next"
import SupportPageClient from "./page.client"

export const metadata: Metadata = {
  title: 'Поддержка::Altrp',
  description: 'Поддержка::Altrp',
}
export default function SupportPage() {
  return <SupportPageClient />
}
import { Metadata } from "next";
import DealEditPageClient from "./page.client";

export const metadata: Metadata = {
  title: 'Редактировать заявку::Altrp',
  description: 'Редактировать заявку::Altrp',
}
export default function DealEditPage() {
  return <DealEditPageClient />
}
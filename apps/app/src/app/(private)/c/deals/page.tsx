import { Metadata } from "next";
import DealsPageClient from "./page.client";

export const metadata: Metadata = {
  title: 'Мои рассрочки::Altrp',
  description: 'Мои рассрочки::Altrp',
}
export default function DealsPage() {
  return <DealsPageClient />
}
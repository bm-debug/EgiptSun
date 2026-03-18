import { Metadata } from "next";
import NewDealPageClient from "./page.client";

export const metadata: Metadata = { 
  title: 'Подать заявку::Altrp',
  description: 'Подать заявку::Altrp',
}
export default function NewDealPage() {
  return <NewDealPageClient />
} 
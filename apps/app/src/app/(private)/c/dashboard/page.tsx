import { Metadata } from "next";
import ConsumerDashboardPageClient from "./page.client";

export const metadata: Metadata = {
  title: 'Личный кабинет::Altrp',
  description: 'Личный кабинет::Altrp',
}
export default function ConsumerDashboardPage() {
  return <ConsumerDashboardPageClient />
}
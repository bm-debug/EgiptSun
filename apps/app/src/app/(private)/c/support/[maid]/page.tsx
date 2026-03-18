import { Metadata } from "next";
import SupportChatPageClient from "./page.client";

export const metadata: Metadata = {   
  title: 'Поддержка - Чат::Altrp',
  description: 'Поддержка - Чат::Altrp',
}
export default function SupportChatPage() {
  return <SupportChatPageClient />
}
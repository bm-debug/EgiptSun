import { Metadata } from "next"
import ProfilePageClient from "./page.client"

export const metadata: Metadata = {
  title: 'Мой профиль - Личные данные::Altrp',
  description: 'Мой профиль - Личные данные::Altrp',
}
export default function ProfilePage() {
  return <ProfilePageClient />
}
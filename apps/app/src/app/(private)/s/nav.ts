import { PackageCheck, Warehouse, Send, Banknote, Users } from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  // Icon from lucide-react
  Icon: React.ComponentType<{ className?: string }>
}

export const sidebarNavItems: NavItem[] = [
  { href: '/s/receiving', label: 'Приемка', Icon: PackageCheck },
  { href: '/s/inventory', label: 'Склад', Icon: Warehouse },
  { href: '/s/sending', label: 'Отправка', Icon: Send },
  { href: '/s/wallets', label: 'Деньги', Icon: Banknote },
  { href: '/s/contractors', label: 'Клиенты', Icon: Users },
]


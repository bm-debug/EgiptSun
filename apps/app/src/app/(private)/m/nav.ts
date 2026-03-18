import { PackageCheck, Warehouse, Send, Banknote, Users, Package } from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  // Icon from lucide-react
  Icon: React.ComponentType<{ className?: string }>
}

export const sidebarNavItems: NavItem[] = [
  { href: '/m/receiving', label: 'Приемка', Icon: PackageCheck },
  { href: '/m/inventory', label: 'Склад', Icon: Warehouse },
  { href: '/m/products', label: 'Продукты', Icon: Package },
  { href: '/m/sending', label: 'Отправка', Icon: Send },
  { href: '/m/wallets', label: 'Деньги', Icon: Banknote },
  { href: '/m/contractors', label: 'Клиенты', Icon: Users },
]


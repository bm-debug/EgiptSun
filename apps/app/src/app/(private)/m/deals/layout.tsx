import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Управление заявками',
}

export default function AdminDealsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}


import AdminContentEditPageClient from './page.client'

export async function generateStaticParams() {
  // Return placeholder params for static export compatibility
  // These pages are primarily accessed via client-side navigation
  return [
    { type: 'blog', id: 'new' },
    { type: 'pages', id: 'new' },
    { type: 'faq', id: 'new' },
  ]
}

type PageProps = {
  params: Promise<{ type: string; id: string }>
}

export default async function AdminContentEditPage({ params }: PageProps) {
  await params
  return <AdminContentEditPageClient />
}

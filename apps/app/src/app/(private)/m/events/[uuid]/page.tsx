import { JournalsRepository } from '@/shared/repositories/journals.repository'
import { notFound } from 'next/navigation'
import EventDetailPageComponent from '@/packages/components/blocks-app/app-admin/pages/EventDetailPageComponent'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import { parseJournals } from '@/shared/utils/http'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  const { uuid } = await params

  const journalsRepository = JournalsRepository.getInstance()
  const journal = await journalsRepository.findByUuid(uuid)

  if (!journal) {
    return notFound()
  }

  // Parse and enrich journal data
  const [parsedJournal] = await parseJournals([journal], true)

  return (
    <>
      <AdminHeader 
        title="Детали события"
        breadcrumbItems={[
          { label: 'Общая сводка', href: '/m/dashboard' },
          { label: 'События', href: '/m/events' },
          { label: 'Детали события' },
        ]}
      />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-6">
          <EventDetailPageComponent journal={parsedJournal} />
        </div>
      </main>
    </>
  )
}


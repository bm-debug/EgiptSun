"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2, Users, Briefcase, FolderKanban, Target, Wallet, FileText, BarChart3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/packages/components/blocks-app/admin/app-sidebar"
import { AdminHeader } from "@/packages/components/blocks-app/app-admin/AdminHeader"
import ContractorDetailClient from "./page.client"

interface Contractor {
  id: number
  uuid: string
  caid: string
  title: string | { [key: string]: string }
  reg?: string
  tin?: string
  statusName?: string
  cityName?: string
  mediaId?: string
  createdAt: string
  updatedAt: string
  dataIn?: any
}

export default function ContractorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const caid = params?.caid as string
  
  const [contractor, setContractor] = React.useState<Contractor | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState("general")

  React.useEffect(() => {
    if (!caid) {
      setError('Contractor CAID is required')
      setLoading(false)
      return
    }

    const fetchContractor = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/admin/state?c=contractors&ps=1&filters[0][field]=caid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(caid)}`, {
          credentials: 'include',
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch contractor: ${response.status}`)
        }
        
        const data = await response.json() as { data?: any[] }
        
        if (!data.data || data.data.length === 0) {
          throw new Error(`Contractor not found with CAID: ${caid}`)
        }
        
        const contractorRecord = data.data[0]
        
        // Parse dataIn if it's a string
        let dataIn = contractorRecord.dataIn || contractorRecord.data_in || {}
        if (typeof dataIn === 'string') {
          try {
            dataIn = JSON.parse(dataIn)
          } catch {
            dataIn = {}
          }
        }
        
        // Parse title if it's a string (JSON)
        let title = contractorRecord.title
        if (typeof title === 'string') {
          try {
            title = JSON.parse(title)
          } catch {
            // Keep as string if not valid JSON
          }
        }
        
        setContractor({
          id: contractorRecord.id,
          uuid: contractorRecord.uuid,
          caid: contractorRecord.caid,
          title: title,
          reg: contractorRecord.reg,
          tin: contractorRecord.tin,
          statusName: contractorRecord.status_name || contractorRecord.statusName,
          cityName: contractorRecord.city_name || contractorRecord.cityName,
          mediaId: contractorRecord.media_id || contractorRecord.mediaId,
          createdAt: contractorRecord.created_at || contractorRecord.createdAt || '',
          updatedAt: contractorRecord.updated_at || contractorRecord.updatedAt || '',
          dataIn,
        })
        setLoading(false)
      } catch (err) {
        console.error('Error fetching contractor:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    fetchContractor()
  }, [caid])

  if (loading) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <SidebarProvider resizable>
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <AdminHeader 
              breadcrumbItems={[
                { label: "Admin Panel", href: "/admin" },
                { label: "Контрагенты", href: "/admin?c=contractors" },
                { label: "Загрузка..." },
              ]}
            />
            <main className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Загрузка контрагента...</p>
                </div>
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    )
  }

  if (error || !contractor) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <SidebarProvider resizable>
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <AdminHeader 
              breadcrumbItems={[
                { label: "Admin Panel", href: "/admin" },
                { label: "Контрагенты", href: "/admin?c=contractors" },
                { label: "Ошибка" },
              ]}
            />
            <main className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle className="text-destructive">Ошибка</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {error || 'Контрагент не найден'}
                    </p>
                    <Button onClick={() => router.back()} variant="outline">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Назад
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    )
  }

  // Get title display value
  const getTitleDisplay = (title: string | { [key: string]: string }): string => {
    if (typeof title === 'string') {
      try {
        const parsed = JSON.parse(title)
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.ru || parsed.en || parsed.rs || Object.values(parsed)[0] || '-'
        }
        return title
      } catch {
        return title
      }
    }
    if (typeof title === 'object' && title !== null) {
      return title.ru || title.en || title.rs || Object.values(title)[0] || '-'
    }
    return '-'
  }

  const titleDisplay = getTitleDisplay(contractor.title)

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarProvider resizable>
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <AdminHeader
            breadcrumbItems={[
              { label: "Admin Panel", href: "/admin" },
              { label: "Контрагенты", href: "/admin?c=contractors" },
              { label: titleDisplay },
            ]}
          />
          <main className="flex-1 overflow-y-auto p-4">
            {/* Header with logo, tabs (desktop), and badge */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              {/* Left column: back button + logo + title */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <Button onClick={() => router.push('/admin?c=contractors&p=1&ps=20')} variant="outline" size="icon" className="shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3 min-w-0">
                  {contractor.mediaId && (
                    <img
                      src={`/api/altrp/v1/admin/files/${contractor.mediaId}`}
                      alt="Logo"
                      className="h-12 w-12 rounded object-cover shrink-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  )}
                  <div className="min-w-0">
                    <h1 className="text-3xl font-bold truncate">{titleDisplay}</h1>
                    <p className="text-muted-foreground">
                      CAID: {contractor.caid}
                    </p>
                  </div>
                                                  {/* Right column: Tabs + badge */}
              <div className="hidden sm:flex items-center justify-end gap-4 py-2 pt-4 shrink-0">
                <ContractorDetailClient 
                  caid={caid} 
                  contractor={contractor} 
                  showTabsOnly={true}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
                {contractor.statusName && (
                  <Badge variant="secondary" className="shrink-0">
                    {contractor.statusName}
                  </Badge>
                )}
              </div>
            {/* Tabs (mobile only) */}
            <div className="mb-4 sm:hidden">
              <ContractorDetailClient 
                caid={caid} 
                contractor={contractor} 
                showTabsOnly={true}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>

                </div>
              </div>
            </div>



            {/* Tab content */}
            <ContractorDetailClient 
              caid={caid} 
              contractor={contractor} 
              showTabsOnly={false}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Users, Briefcase, FolderKanban, Target, Wallet, FileText, BarChart3, Building2, Link2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/packages/components/blocks-app/admin/data-table"
import { AdminStateProvider, useAdminState } from "@/packages/components/blocks-app/app-admin/AdminStateProvider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ContractorDetailClientProps {
  caid: string
  contractor: {
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
  showTabsOnly?: boolean
  activeTab?: string
  setActiveTab?: (value: string) => void
}

export default function ContractorDetailClient({ 
  caid, 
  contractor, 
  showTabsOnly = false,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab
}: ContractorDetailClientProps) {
  const router = useRouter()
  const [internalActiveTab, setInternalActiveTab] = React.useState("general")
  
  // Use external state if provided, otherwise use internal state
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab
  const setActiveTab = externalSetActiveTab || setInternalActiveTab
  
  // Load translations
  const [translations, setTranslations] = React.useState<any>(null)
  const [locale, setLocale] = React.useState<string>('ru')
  
  React.useEffect(() => {
    // Get locale from localStorage or use default
    const getLocale = (): string => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sidebar-locale')
        if (saved) {
          return saved
        }
      }
      return 'ru'
    }
    
    const currentLocale = getLocale()
    setLocale(currentLocale)
    
    // Load translations
    const loadTranslations = async () => {
      try {
        const cacheKey = `sidebar-translations-${currentLocale}`
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem(cacheKey) : null
        
        if (cached) {
          try {
            const cachedTranslations = JSON.parse(cached)
            setTranslations(cachedTranslations)
          } catch (e) {
            console.error('[ContractorDetailClient] Failed to parse cached translations:', e)
          }
        }
        
        const response = await fetch(`/api/locales/${currentLocale}`)
        if (!response.ok) {
          throw new Error(`Failed to load translations: ${response.status}`)
        }
        const translationsData = await response.json()
        setTranslations(translationsData)
        
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(translationsData))
        }
      } catch (e) {
        console.error('[ContractorDetailClient] Failed to load translations:', e)
        // Fallback: try dynamic import
        try {
          const translationsModule = await import(`@/packages/content/locales/${currentLocale}.json`)
          setTranslations(translationsModule.default || translationsModule)
        } catch (fallbackError) {
          console.error('[ContractorDetailClient] Fallback import also failed:', fallbackError)
        }
      }
    }
    
    void loadTranslations()
  }, [])
  
  // Get translation helper
  const t = React.useMemo(() => {
    if (!translations) {
      return (key: string, fallback: string) => fallback
    }
    return (key: string, fallback: string) => {
      const keys = key.split('.')
      let value: any = translations
      for (const k of keys) {
        value = value?.[k]
        if (value === undefined) break
      }
      return typeof value === 'string' ? value : fallback
    }
  }, [translations])
  
  // Get title display value (handle translation objects)
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
  
  const contractorTitle = getTitleDisplay(contractor.title)
  const [linkContactDialogOpen, setLinkContactDialogOpen] = React.useState(false)
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null)
  const [linking, setLinking] = React.useState(false)
  
  // State for linking other entities
  const [linkEntityDialogOpen, setLinkEntityDialogOpen] = React.useState(false)
  const [linkEntityConfig, setLinkEntityConfig] = React.useState<{
    collection: string
    linkField: string
    dialogTitle: string
  } | null>(null)
  const [selectedEntityId, setSelectedEntityId] = React.useState<string | null>(null)
  const [linkingEntity, setLinkingEntity] = React.useState(false)

  const tabsList = (
    <TabsList className="inline-flex items-center gap-0 w-auto overflow-visible" style={{ justifyContent: 'flex-end' }}>
      <TabsTrigger value="general" className="flex flex-col items-center justify-center gap-1 px-2 py-1.5 sm:py-3 h-[40px] sm:h-16 bg-white/0 data-[state=inactive]:bg-white/0 data-[state=active]:bg-white data-[state=active]:shadow min-h-[40px] sm:min-h-16">
        <Building2 className="h-4 w-4 sm:h-6 sm:w-6" />
        <span className="text-xs hidden sm:inline">Общее</span>
      </TabsTrigger>
      <TabsTrigger value="contacts" className="flex flex-col items-center justify-center gap-1 px-2 py-1.5 sm:py-3 h-[40px] sm:h-16 bg-white/0 data-[state=inactive]:bg-white/0 data-[state=active]:bg-white data-[state=active]:shadow min-h-[40px] sm:min-h-16">
        <Users className="h-4 w-4 sm:h-6 sm:w-6" />
        <span className="text-xs hidden sm:inline">{t('olap.contractors.contacts', 'Контакты')}</span>
      </TabsTrigger>
      <TabsTrigger value="deals" className="flex flex-col items-center justify-center gap-1 px-2 py-1.5 sm:py-3 h-[40px] sm:h-16 bg-white/0 data-[state=inactive]:bg-white/0 data-[state=active]:bg-white data-[state=active]:shadow min-h-[40px] sm:min-h-16">
        <Briefcase className="h-4 w-4 sm:h-6 sm:w-6" />
        <span className="text-xs hidden sm:inline">{t('olap.contractors.deals', 'Сделки')}</span>
      </TabsTrigger>
      <TabsTrigger value="projects" className="flex flex-col items-center justify-center gap-1 px-2 py-1.5 sm:py-3 h-[40px] sm:h-16 bg-white/0 data-[state=inactive]:bg-white/0 data-[state=active]:bg-white data-[state=active]:shadow min-h-[40px] sm:min-h-16">
        <FolderKanban className="h-4 w-4 sm:h-6 sm:w-6" />
        <span className="text-xs hidden sm:inline">Проекты</span>
      </TabsTrigger>
      <TabsTrigger value="goals" className="flex flex-col items-center justify-center gap-1 px-2 py-1.5 sm:py-3 h-[40px] sm:h-16 bg-white/0 data-[state=inactive]:bg-white/0 data-[state=active]:bg-white data-[state=active]:shadow min-h-[40px] sm:min-h-16">
        <Target className="h-4 w-4 sm:h-6 sm:w-6" />
        <span className="text-xs hidden sm:inline">Задачи</span>
      </TabsTrigger>
      <TabsTrigger value="finances" className="flex flex-col items-center justify-center gap-1 px-2 py-1.5 sm:py-3 h-[40px] sm:h-16 bg-white/0 data-[state=inactive]:bg-white/0 data-[state=active]:bg-white data-[state=active]:shadow min-h-[40px] sm:min-h-16">
        <Wallet className="h-4 w-4 sm:h-6 sm:w-6" />
        <span className="text-xs hidden sm:inline">Финансы</span>
      </TabsTrigger>
      <TabsTrigger value="documents" className="flex flex-col items-center justify-center gap-1 px-2 py-1.5 sm:py-3 h-[40px] sm:h-16 bg-white/0 data-[state=inactive]:bg-white/0 data-[state=active]:bg-white data-[state=active]:shadow min-h-[40px] sm:min-h-16">
        <FileText className="h-4 w-4 sm:h-6 sm:w-6" />
        <span className="text-xs hidden sm:inline">Документы</span>
      </TabsTrigger>
    </TabsList>
  )

  if (showTabsOnly) {
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="inline-flex">
        {tabsList}
      </Tabs>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      {/* TabsList is rendered in header, so we don't render it here */}
      <TabsContent value="general" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Общее
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contractor.reg && (
                <div>
                  <p className="text-sm text-muted-foreground">Рег. №</p>
                  <p className="font-medium">{contractor.reg}</p>
                </div>
              )}
              {contractor.tin && (
                <div>
                  <p className="text-sm text-muted-foreground">ИНН</p>
                  <p className="font-medium">{contractor.tin}</p>
                </div>
              )}
              {contractor.cityName && (
                <div>
                  <p className="text-sm text-muted-foreground">Город</p>
                  <p className="font-medium">{contractor.cityName}</p>
                </div>
              )}
              {contractor.dataIn && typeof contractor.dataIn === 'object' && (
                Object.entries(contractor.dataIn).map(([key, value]) => {
                  if (value === null || value === undefined || value === '') return null
                  return (
                    <div key={key}>
                      <p className="text-sm text-muted-foreground">{key}</p>
                      <p className="font-medium">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
        <div className="mt-4">
          <DashboardTab caid={caid} />
        </div>
      </TabsContent>

      <TabsContent value="contacts" className="mt-4">
        <AdminStateProvider
          initialState={{
            collection: "humans",
            page: 1,
            pageSize: 10,
            filters: [{ field: 'data_in.contractor_caid', op: 'eq', value: caid }],
            search: "",
          }}
        >
          <DataTableWithLinkButton
            onLinkClick={() => setLinkContactDialogOpen(true)}
          />
        </AdminStateProvider>
      </TabsContent>

      <TabsContent value="deals" className="mt-4">
        <AdminStateProvider
          initialState={{
            collection: "deals",
            page: 1,
            pageSize: 10,
            filters: [{ field: 'client_aid', op: 'eq', value: caid }],
            search: "",
          }}
        >
          <DataTableWithLinkButton
            onLinkClick={() => {
              setLinkEntityConfig({
                collection: "deals",
                linkField: "client_aid",
                dialogTitle: "Выберите сделку для привязки"
              })
              setLinkEntityDialogOpen(true)
            }}
          />
        </AdminStateProvider>
      </TabsContent>

      <TabsContent value="projects" className="mt-4">
        <AdminStateProvider
          initialState={{
            collection: "deals",
            page: 1,
            pageSize: 10,
            filters: [
              { field: 'client_aid', op: 'eq', value: caid },
              { field: 'status_name', op: 'eq', value: 'project' }
            ],
            search: "",
          }}
        >
          <DataTableWithLinkButton
            onLinkClick={() => {
              setLinkEntityConfig({
                collection: "deals",
                linkField: "client_aid",
                dialogTitle: "Выберите проект для привязки"
              })
              setLinkEntityDialogOpen(true)
            }}
          />
        </AdminStateProvider>
      </TabsContent>

      <TabsContent value="goals" className="mt-4">
        <AdminStateProvider
          initialState={{
            collection: "goals",
            page: 1,
            pageSize: 10,
            filters: [{ field: 'data_in.contractor_caid', op: 'eq', value: caid }],
            search: "",
          }}
        >
          <DataTableWithLinkButton
            onLinkClick={() => {
              setLinkEntityConfig({
                collection: "goals",
                linkField: "data_in.contractor_caid",
                dialogTitle: "Выберите задачу для привязки"
              })
              setLinkEntityDialogOpen(true)
            }}
          />
        </AdminStateProvider>
      </TabsContent>

      <TabsContent value="finances" className="mt-4">
        <AdminStateProvider
          initialState={{
            collection: "finances",
            page: 1,
            pageSize: 10,
            filters: [{ field: 'data_in.contractor_caid', op: 'eq', value: caid }],
            search: "",
          }}
        >
          <DataTableWithLinkButton
            onLinkClick={() => {
              setLinkEntityConfig({
                collection: "finances",
                linkField: "data_in.contractor_caid",
                dialogTitle: "Выберите транзакцию для привязки"
              })
              setLinkEntityDialogOpen(true)
            }}
          />
        </AdminStateProvider>
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <AdminStateProvider
          initialState={{
            collection: "assets",
            page: 1,
            pageSize: 10,
            filters: [{ field: 'data_in.contractor_caid', op: 'eq', value: caid }],
            search: "",
          }}
        >
          <DataTableWithLinkButton
            onLinkClick={() => {
              setLinkEntityConfig({
                collection: "assets",
                linkField: "data_in.contractor_caid",
                dialogTitle: "Выберите документ для привязки"
              })
              setLinkEntityDialogOpen(true)
            }}
          />
        </AdminStateProvider>
      </TabsContent>

      {/* Dialog for linking existing contact */}
      <Dialog open={linkContactDialogOpen} onOpenChange={setLinkContactDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Выберите контакт для привязки</DialogTitle>
            <DialogDescription>
              Выберите существующую запись из списка для привязки к контрагенту "{contractorTitle}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <AdminStateProvider
              initialState={{
                collection: "humans",
                page: 1,
                pageSize: 20,
                filters: [],
                search: "",
              }}
            >
              <LinkEntityTable
                collection="humans"
                onSelect={(contactId) => {
                  setSelectedContactId(contactId)
                }}
                selectedId={selectedContactId}
              />
            </AdminStateProvider>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setLinkContactDialogOpen(false)
                setSelectedContactId(null)
              }}
            >
              Отмена
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedContactId) return
                
                setLinking(true)
                try {
                  // Fetch current human data
                  const humanRes = await fetch(`/api/admin/state?c=humans&ps=1&filters[0][field]=id&filters[0][op]=eq&filters[0][value]=${selectedContactId}`, {
                    credentials: 'include'
                  })
                  
                  if (!humanRes.ok) {
                    throw new Error('Failed to fetch human data')
                  }
                  
                  const humanData = await humanRes.json() as { data?: any[] }
                  const human = humanData.data?.[0]
                  
                  if (!human) {
                    throw new Error('Human not found')
                  }
                  
                  // Get current data_in
                  let dataIn: any = {}
                  if (human.data_in) {
                    try {
                      dataIn = typeof human.data_in === 'string' 
                        ? JSON.parse(human.data_in) 
                        : human.data_in
                    } catch {
                      dataIn = {}
                    }
                  }
                  
                  // Update data_in with contractor_caid
                  dataIn.contractor_caid = caid
                  
                  // Update human record
                  const updateRes = await fetch(`/api/admin/humans/${human.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      data_in: dataIn
                    })
                  })
                  
                  if (!updateRes.ok) {
                    const errorData = await updateRes.json() as { error?: string }
                    throw new Error(errorData.error || 'Failed to link contact')
                  }
                  
                  // Close dialog and refresh table
                  setLinkContactDialogOpen(false)
                  setSelectedContactId(null)
                  // Trigger a refresh by updating a key or reloading
                  window.location.reload()
                } catch (error) {
                  console.error('Error linking contact:', error)
                  alert(error instanceof Error ? error.message : 'Ошибка при привязке контакта')
                } finally {
                  setLinking(false)
                }
              }}
              disabled={!selectedContactId || linking}
              className="bg-green-600 hover:bg-green-700"
            >
              {linking ? 'Привязка...' : 'Привязать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal dialog for linking other entities (deals, goals, finances) */}
      {linkEntityConfig && (
        <Dialog open={linkEntityDialogOpen} onOpenChange={setLinkEntityDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{linkEntityConfig.dialogTitle}</DialogTitle>
              <DialogDescription>
                Выберите существующую запись из списка для привязки к контрагенту "{contractorTitle}"
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
              <AdminStateProvider
                initialState={{
                  collection: linkEntityConfig.collection,
                  page: 1,
                  pageSize: 20,
                  filters: [],
                  search: "",
                }}
              >
                <LinkEntityTable 
                  collection={linkEntityConfig.collection}
                  onSelect={(entityId) => {
                    setSelectedEntityId(entityId)
                  }}
                  selectedId={selectedEntityId}
                />
              </AdminStateProvider>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setLinkEntityDialogOpen(false)
                  setSelectedEntityId(null)
                  setLinkEntityConfig(null)
                }}
              >
                Отмена
              </Button>
              <Button 
                onClick={async () => {
                  if (!selectedEntityId || !linkEntityConfig) return
                  
                  setLinkingEntity(true)
                  try {
                    // Fetch current entity data
                    const entityRes = await fetch(`/api/admin/state?c=${linkEntityConfig.collection}&ps=1&filters[0][field]=id&filters[0][op]=eq&filters[0][value]=${selectedEntityId}`, {
                      credentials: 'include'
                    })
                    
                    if (!entityRes.ok) {
                      throw new Error('Failed to fetch entity data')
                    }
                    
                    const entityData = await entityRes.json() as { data?: any[] }
                    const entity = entityData.data?.[0]
                    
                    if (!entity) {
                      throw new Error('Entity not found')
                    }
                    
                    // Update entity based on linkField type
                    if (linkEntityConfig.linkField === 'client_aid') {
                      // For deals: update client_aid directly
                      const updateRes = await fetch(`/api/admin/${linkEntityConfig.collection}/${entity.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                          client_aid: caid
                        })
                      })
                      
                      if (!updateRes.ok) {
                        const errorData = await updateRes.json() as { error?: string }
                        throw new Error(errorData.error || 'Failed to link entity')
                      }
                    } else if (linkEntityConfig.linkField === 'data_in.contractor_caid') {
                      // For goals, finances: update data_in.contractor_caid
                      let dataIn: any = {}
                      if (entity.data_in) {
                        try {
                          dataIn = typeof entity.data_in === 'string' 
                            ? JSON.parse(entity.data_in) 
                            : entity.data_in
                        } catch {
                          dataIn = {}
                        }
                      }
                      
                      dataIn.contractor_caid = caid
                      
                      const updateRes = await fetch(`/api/admin/${linkEntityConfig.collection}/${entity.id}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                          data_in: dataIn
                        })
                      })
                      
                      if (!updateRes.ok) {
                        const errorData = await updateRes.json() as { error?: string }
                        throw new Error(errorData.error || 'Failed to link entity')
                      }
                    }
                    
                    // Close dialog and refresh
                    setLinkEntityDialogOpen(false)
                    setSelectedEntityId(null)
                    setLinkEntityConfig(null)
                    window.location.reload()
                  } catch (error) {
                    console.error('Error linking entity:', error)
                    alert(error instanceof Error ? error.message : 'Ошибка при привязке записи')
                  } finally {
                    setLinkingEntity(false)
                  }
                }}
                disabled={!selectedEntityId || linkingEntity}
                className="bg-green-600 hover:bg-green-700"
              >
                {linkingEntity ? 'Привязка...' : 'Привязать'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Tabs>
  )
}

// Wrapper component to add "Привязать" button next to "Add" button in DataTable
function DataTableWithLinkButton({ onLinkClick }: { onLinkClick: () => void }) {
  const ContainerRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    if (!ContainerRef.current) return
    
    const insertButton = () => {
      // Find the Container with buttons (ml-auto class)
      const buttonsContainer = ContainerRef.current?.querySelector('.ml-auto.flex.items-center') as HTMLElement
      if (!buttonsContainer) return
      
      // Check if button already exists
      if (buttonsContainer.querySelector('[data-link-button]')) return
      
      // Find the "Add" button - look for button that contains "+" or "Добавить" or "Add" text
      // and is a direct child or in a direct child div of buttonsContainer
      const allElements = Array.from(buttonsContainer.children)
      let addButton: HTMLElement | null = null
      
      // Look through direct children
      for (const child of allElements) {
        if (child.tagName === 'BUTTON') {
          const btn = child as HTMLElement
          const text = btn.textContent || ''
          const hasPlus = text.includes('+') || text.includes('Добавить') || text.includes('Add')
          if (hasPlus) {
            addButton = btn
            break
          }
        } else if (child.tagName === 'DIV') {
          // Check if it contains a button with plus
          const btn = child.querySelector('button') as HTMLElement
          if (btn) {
            const text = btn.textContent || ''
            const hasPlus = text.includes('+') || text.includes('Добавить') || text.includes('Add')
            if (hasPlus) {
              addButton = btn
              break
            }
          }
        }
      }
      
      // Fallback: find last button in Container
      if (!addButton) {
        const lastButton = buttonsContainer.querySelector('button:last-of-type') as HTMLElement
        if (lastButton) {
          addButton = lastButton
        }
      }
      
      if (!addButton) return
      
      // Get the parent of addButton (should be buttonsContainer or a direct child)
      const addButtonParent = addButton.parentElement
      if (!addButtonParent) return
      
      // Create button element
      const buttonElement = document.createElement('button')
      buttonElement.setAttribute('data-link-button', 'true')
      buttonElement.type = 'button'
      buttonElement.className = 'inline-flex items-center justify-center gap-2 rounded-md bg-green-600 hover:bg-green-700 text-sm font-medium text-white h-9 px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
      buttonElement.innerHTML = `
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span class="hidden sm:inline">Привязать</span>
      `
      buttonElement.onclick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        onLinkClick()
      }
      
      // Insert AFTER the "Add" button in the same parent Container
      if (addButton.nextSibling) {
        addButtonParent.insertBefore(buttonElement, addButton.nextSibling)
      } else {
        addButtonParent.appendChild(buttonElement)
      }
    }
    
    // Try to insert immediately
    insertButton()
    
    // Also try after a short delay in case DataTable hasn't rendered yet
    const timeoutId = setTimeout(insertButton, 100)
    
    // Also observe for DOM changes
    const observer = new MutationObserver(() => {
      insertButton()
    })
    
    if (ContainerRef.current) {
      observer.observe(ContainerRef.current, {
        childList: true,
        subtree: true
      })
    }
    
    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
      // Cleanup on unmount
      const existingButton = ContainerRef.current?.querySelector('[data-link-button]')
      if (existingButton) {
        existingButton.remove()
      }
    }
  }, [onLinkClick])
  
  return (
    <div ref={ContainerRef}>
      <DataTable />
    </div>
  )
}

// Universal component for selecting entity in dialog - uses DataTable with row selection
function LinkEntityTable({ 
  collection,
  onSelect, 
  selectedId 
}: { 
  collection: string
  onSelect: (id: string) => void
  selectedId: string | null
}) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null)
  const [allData, setAllData] = React.useState<any[]>([])
  const { state } = useAdminState()
  
  // Fetch all data to track selections
  React.useEffect(() => {
    const fetchAllData = async () => {
      try {
        const queryParams = new URLSearchParams({
          c: state.collection,
          p: '1',
          ps: '1000',
          ...(state.search && { s: state.search }),
        })
        
        if (state.filters.length > 0) {
          queryParams.set('filters', JSON.stringify(state.filters))
        }
        
        const res = await fetch(`/api/admin/state?${queryParams}`, {
          credentials: 'include'
        })
        
        if (res.ok) {
          const json = await res.json() as { data?: any[] }
          setAllData(json.data || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    
    fetchAllData()
  }, [state.collection, state.filters, state.search])
  
  React.useEffect(() => {
    // Listen for clicks on table rows (single click for selection)
    const handleRowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't trigger on button clicks, checkboxes, or action cells
      if (target.closest('button') || target.closest('input[type="checkbox"]') || target.closest('[data-action-cell]')) {
        return
      }
      
      const row = target.closest('tbody tr')
      if (row) {
        // Find entity by matching id from first cell (usually contains id or aid)
        const cells = row.querySelectorAll('td')
        if (cells.length > 0) {
          // First cell usually contains id, daid, gaid, faid, etc.
          const firstCellText = cells[0]?.textContent?.trim()
          const entity = allData.find((r: any) => 
            String(r.id) === firstCellText || 
            String(r.daid) === firstCellText ||
            String(r.gaid) === firstCellText ||
            String(r.faid) === firstCellText ||
            String(r.haid) === firstCellText ||
            String(r.aaid) === firstCellText
          )
          
          if (entity) {
            const entityId = String(entity.id)
            onSelect(entityId)
            
            // Visual feedback - highlight selected row
            const allRows = tableContainerRef.current?.querySelectorAll('tbody tr')
            allRows?.forEach((r) => {
              r.classList.remove('bg-green-100', 'ring-2', 'ring-green-500')
            })
            row.classList.add('bg-green-100', 'ring-2', 'ring-green-500')
          }
        }
      }
    }
    
    const Container = tableContainerRef.current
    if (Container) {
      // Use a small delay to ensure table is rendered
      const timeoutId = setTimeout(() => {
        Container.addEventListener('click', handleRowClick)
      }, 200)
      
      return () => {
        clearTimeout(timeoutId)
        Container.removeEventListener('click', handleRowClick)
      }
    }
  }, [onSelect, allData])
  
  // Highlight selected row when selectedId changes
  React.useEffect(() => {
    if (!selectedId || !tableContainerRef.current) return
    
    // Use a small delay to ensure table is rendered
    const timeoutId = setTimeout(() => {
      const allRows = tableContainerRef.current?.querySelectorAll('tbody tr')
      allRows?.forEach((row) => {
        const cells = row.querySelectorAll('td')
        if (cells.length > 0) {
          const firstCellText = cells[0]?.textContent?.trim()
          const isSelected = allData.some((r: any) => 
            String(r.id) === selectedId && 
            (String(r.id) === firstCellText || 
             String(r.daid) === firstCellText ||
             String(r.gaid) === firstCellText ||
             String(r.faid) === firstCellText ||
             String(r.haid) === firstCellText ||
             String(r.aaid) === firstCellText)
          )
          
          if (isSelected) {
            row.classList.add('bg-green-100', 'ring-2', 'ring-green-500')
          } else {
            row.classList.remove('bg-green-100', 'ring-2', 'ring-green-500')
          }
        }
      })
    }, 200)
    
    return () => clearTimeout(timeoutId)
  }, [selectedId, allData])
  
  return (
    <div ref={tableContainerRef} className="h-full overflow-auto">
      <DataTable />
    </div>
  )
}

// Component for selecting contact in dialog - uses DataTable with row selection
function LinkContactTable({ 
  onSelect, 
  selectedId 
}: { 
  onSelect: (id: string) => void
  selectedId: string | null
}) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null)
  const [allData, setAllData] = React.useState<any[]>([])
  const { state } = useAdminState()
  
  // Fetch all data to track selections
  React.useEffect(() => {
    const fetchAllData = async () => {
      try {
        const queryParams = new URLSearchParams({
          c: state.collection,
          p: '1',
          ps: '1000', // Get more data for selection
          ...(state.search && { s: state.search }),
        })
        
        if (state.filters.length > 0) {
          queryParams.set('filters', JSON.stringify(state.filters))
        }
        
        const res = await fetch(`/api/admin/state?${queryParams}`, {
          credentials: 'include'
        })
        
        if (res.ok) {
          const json = await res.json() as { data?: any[] }
          setAllData(json.data || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    
    fetchAllData()
  }, [state.collection, state.filters, state.search])
  
  React.useEffect(() => {
    // Listen for clicks on table rows (single click for selection)
    const handleRowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't trigger on button clicks, checkboxes, or action cells
      if (target.closest('button') || target.closest('input[type="checkbox"]') || target.closest('[data-action-cell]')) {
        return
      }
      
      const row = target.closest('tbody tr')
      if (row) {
        // Find contact by matching haid or id from first cell (usually contains haid)
        const cells = row.querySelectorAll('td')
        if (cells.length > 0) {
          // First cell usually contains haid
          const firstCellText = cells[0]?.textContent?.trim()
          const contact = allData.find((r: any) => 
            String(r.haid) === firstCellText || 
            String(r.id) === firstCellText
          )
          
          if (contact) {
            const contactId = String(contact.id || contact.haid)
            onSelect(contactId)
            
            // Visual feedback - highlight selected row
            const allRows = tableContainerRef.current?.querySelectorAll('tbody tr')
            allRows?.forEach((r) => {
              r.classList.remove('bg-green-100', 'ring-2', 'ring-green-500')
            })
            row.classList.add('bg-green-100', 'ring-2', 'ring-green-500')
          }
        }
      }
    }
    
    const Container = tableContainerRef.current
    if (Container) {
      // Use a small delay to ensure table is rendered
      const timeoutId = setTimeout(() => {
        Container.addEventListener('click', handleRowClick)
      }, 200)
      
      return () => {
        clearTimeout(timeoutId)
        Container.removeEventListener('click', handleRowClick)
      }
    }
  }, [onSelect, allData])
  
  // Highlight selected row when selectedId changes
  React.useEffect(() => {
    if (!selectedId || !tableContainerRef.current) return
    
    // Use a small delay to ensure table is rendered
    const timeoutId = setTimeout(() => {
      const allRows = tableContainerRef.current?.querySelectorAll('tbody tr')
      allRows?.forEach((row) => {
        const cells = row.querySelectorAll('td')
        if (cells.length > 0) {
          const firstCellText = cells[0]?.textContent?.trim()
          const isSelected = allData.some((r: any) => 
            String(r.id || r.haid) === selectedId && 
            (String(r.haid) === firstCellText || String(r.id) === firstCellText)
          )
          
          if (isSelected) {
            row.classList.add('bg-green-100', 'ring-2', 'ring-green-500')
          } else {
            row.classList.remove('bg-green-100', 'ring-2', 'ring-green-500')
          }
        }
      })
    }, 200)
    
    return () => clearTimeout(timeoutId)
  }, [selectedId, allData])
  
  return (
    <div ref={tableContainerRef} className="h-full overflow-auto">
      <DataTable />
    </div>
  )
}


function DashboardTab({ caid }: { caid: string }) {
  const [metrics, setMetrics] = React.useState({
    contactsCount: 0,
    dealsCount: 0,
    dealsTotal: 0,
    projectsCount: 0,
    goalsCount: 0,
    financesIncome: 0,
    financesExpense: 0,
    financesBalance: 0,
  })
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        
        // Fetch all related data
        const [contactsRes, dealsRes, projectsRes, goalsRes, financesRes] = await Promise.all([
          fetch(`/api/admin/state?c=humans&ps=1000&filters[0][field]=data_in.contractor_caid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(caid)}`, { credentials: 'include' }),
          fetch(`/api/admin/state?c=deals&ps=1000&filters[0][field]=client_aid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(caid)}`, { credentials: 'include' }),
          fetch(`/api/admin/state?c=deals&ps=1000&filters[0][field]=client_aid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(caid)}&filters[1][field]=status_name&filters[1][op]=eq&filters[1][value]=project`, { credentials: 'include' }),
          fetch(`/api/admin/state?c=goals&ps=1000&filters[0][field]=data_in.contractor_caid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(caid)}`, { credentials: 'include' }),
          fetch(`/api/admin/state?c=finances&ps=1000&filters[0][field]=data_in.contractor_caid&filters[0][op]=eq&filters[0][value]=${encodeURIComponent(caid)}`, { credentials: 'include' }),
        ])

        const [contactsData, dealsData, projectsData, goalsData, financesData] = await Promise.all([
          contactsRes.ok ? (contactsRes.json() as Promise<{ data?: any[] }>) : Promise.resolve({ data: [] }),
          dealsRes.ok ? (dealsRes.json() as Promise<{ data?: any[] }>) : Promise.resolve({ data: [] }),
          projectsRes.ok ? (projectsRes.json() as Promise<{ data?: any[] }>) : Promise.resolve({ data: [] }),
          goalsRes.ok ? (goalsRes.json() as Promise<{ data?: any[] }>) : Promise.resolve({ data: [] }),
          financesRes.ok ? (financesRes.json() as Promise<{ data?: any[] }>) : Promise.resolve({ data: [] }),
        ])

        // Calculate metrics
        const contactsCount = contactsData.data?.length || 0
        const dealsCount = dealsData.data?.length || 0
        const projectsCount = projectsData.data?.length || 0
        const goalsCount = goalsData.data?.length || 0
        
        // Calculate deals total
        let dealsTotal = 0
        if (dealsData.data) {
          dealsData.data.forEach((deal: any) => {
            const dataIn = typeof deal.data_in === 'string' ? JSON.parse(deal.data_in || '{}') : (deal.data_in || {})
            const total = Number(dataIn.total || dataIn.totalAmount || 0)
            dealsTotal += total
          })
        }

        // Calculate finances
        let financesIncome = 0
        let financesExpense = 0
        if (financesData.data) {
          financesData.data.forEach((finance: any) => {
            const sum = Number(finance.sum || 0)
            const type = finance.type || ''
            if (type === 'income' || sum > 0) {
              financesIncome += Math.abs(sum)
            } else {
              financesExpense += Math.abs(sum)
            }
          })
        }

        setMetrics({
          contactsCount,
          dealsCount,
          dealsTotal: dealsTotal / 100, // Convert from cents
          projectsCount,
          goalsCount,
          financesIncome: financesIncome / 100,
          financesExpense: financesExpense / 100,
          financesBalance: (financesIncome - financesExpense) / 100,
        })
        setLoading(false)
      } catch (err) {
        console.error('Error fetching metrics:', err)
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [caid])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Загрузка метрик...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Контакты</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.contactsCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Сделки</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.dealsCount}</div>
          <p className="text-xs text-muted-foreground">
            Сумма: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(metrics.dealsTotal)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Проекты</CardTitle>
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.projectsCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Задачи</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.goalsCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Доходы</CardTitle>
          <Wallet className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(metrics.financesIncome)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Расходы</CardTitle>
          <Wallet className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(metrics.financesExpense)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Баланс</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.financesBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(metrics.financesBalance)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

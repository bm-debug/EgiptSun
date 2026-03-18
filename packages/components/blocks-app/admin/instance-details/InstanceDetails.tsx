import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { InstanceDetailsProps } from "./types"
import React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Briefcase, Building2, FileText, FolderKanban, Target, Users, Wallet } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/packages/components/ui/dialog"
import { AdminStateProvider } from "../../app-admin/AdminStateProvider"
import { Button } from "@/packages/components/ui/button"
import { GeneralTabFactory } from "./general-tabs/GeneralTabFactory"
import { OLAPTab } from "@/shared/collections/BaseCollection"
import { DataTableWithLinkButton } from "./DataTableWithLinkButton"
import { InstanceDetailsHeader } from "./InstanceDetailsHeader"


export function InstanceDetails({ 
    altrpIndex, 
    collectionName,
    instance,
    title,
    activeTab: externalActiveTab,
    setActiveTab: externalSetActiveTab,
    olapTabs = []
  }: InstanceDetailsProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    
    // Get all available tab IDs
    const allTabIds = React.useMemo(() => {
      return ['general', ...olapTabs.map(tab => tab.id)]
    }, [olapTabs])
    
    // Get active tab from URL, default to 'general'
    const tabFromUrl = searchParams.get('tab') || 'general'
    const [internalActiveTab, setInternalActiveTab] = React.useState(
      externalActiveTab || (allTabIds.includes(tabFromUrl) ? tabFromUrl : 'general')
    )
    
    // Use external state if provided, otherwise use internal state with URL sync
    const currentActiveTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab
    
    // Sync with URL when URL changes (e.g., back/forward browser buttons)
    React.useEffect(() => {
      if (externalActiveTab === undefined) {
        // Only sync with URL if not using external state
        const tab = searchParams.get('tab') || 'general'
        if (allTabIds.includes(tab) && tab !== internalActiveTab) {
          setInternalActiveTab(tab)
        } else if (!allTabIds.includes(tab) && internalActiveTab !== 'general') {
          setInternalActiveTab('general')
        }
      }
    }, [searchParams, allTabIds, externalActiveTab, internalActiveTab])
    
    // Handle tab change with URL synchronization
    const handleTabChange = React.useCallback((value: string) => {
      // If external setActiveTab is provided, use it
      if (externalSetActiveTab) {
        externalSetActiveTab(value)
        return
      }
      
      // Otherwise, update internal state and URL
      setInternalActiveTab(value)
      
      // Update URL with new tab parameter, preserving other query params
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'general') {
        // Remove tab param for default tab
        params.delete('tab')
      } else {
        params.set('tab', value)
      }
      
      // Build new URL
      const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`
      
      // Update URL with pushState to save in browser history
      router.push(newUrl)
    }, [router, pathname, searchParams, externalSetActiveTab])
    
    const setActiveTab = externalSetActiveTab || handleTabChange
    
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


    const finalTabs = [
      {
        label: 'Общее',
        id: 'general',
        icon: 'Building2',
      },
      ...olapTabs,
    ]

    // Helper function to get icon for tab
    const getTabIcon = (tab: { id: string; collection?: string }) => {
      const tabId = tab.id.toLowerCase()
      const tabCollection = tab.collection?.toLowerCase()
      
      if (tabId === 'humans' || tabCollection === 'humans' || tabId === 'contacts') {
        return Users
      }
      if (tabId === 'deals' || tabCollection === 'deals') {
        return Briefcase
      }
      if (tabId === 'projects' || tabCollection === 'projects') {
        return FolderKanban
      }
      if (tabId === 'goals' || tabCollection === 'goals') {
        return Target
      }
      if (tabId === 'finances' || tabCollection === 'finances') {
        return Wallet
      }
      if (tabId === 'documents' || tabCollection === 'documents') {
        return FileText
      }
      // Default icon
      return Building2
    }
    
    const tabsList = (
      <TabsList className="inline-flex items-center justify-center gap-2 w-auto h-8 md:h-14">
        {
          finalTabs.map((tab,idx)=>{
            const IconComponent = getTabIcon(tab)
            return  <TabsTrigger value={tab.id} key={tab.id} className="flex flex-col items-center justify-center gap-0 md:gap-1 px-2 md:px-3">
              <IconComponent className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs hidden md:block">{tab.label}</span>
            </TabsTrigger>
          })
        }
      </TabsList>
    )
  
    return (
      <Tabs value={currentActiveTab} onValueChange={setActiveTab} className="w-full">
        {title && (
          <InstanceDetailsHeader
            instance={instance}
            title={title}
            altrpIndex={altrpIndex}
            collectionName={collectionName}
            olapTabs={olapTabs}
            tabsList={tabsList}
          />
        )}
        <TabsContent value="general" className="mt-4">
          <GeneralTabFactory collectionName={collectionName} instance={instance}/>
        </TabsContent>
        {olapTabs.map((tab, idx)=>{
          return <OlapTabContent key={`olap-tab-${tab.id}`} olapTab={tab} instance={instance}></OlapTabContent>
        })}
        {/* todo: Universal dialog for linking other entities (deals, goals, finances) */}
        {linkEntityConfig && (
          <Dialog open={linkEntityDialogOpen} onOpenChange={setLinkEntityDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{linkEntityConfig.dialogTitle}</DialogTitle>
                <DialogDescription>
                  Выберите существующую запись из списка для привязки к контрагенту "{title}"
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
                  AdminStateProvider
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
                            client_aid: altrpIndex
                          })
                        })
                        
                        if (!updateRes.ok) {
                          const errorData = await updateRes.json() as { error?: string }
                          throw new Error(errorData.error || 'Failed to link entity')
                        }
                      } else if (linkEntityConfig.linkField === 'data_in.contractor_altrpIndex') {
                        // For goals, finances: update data_in.contractor_altrpIndex
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
                        
                        dataIn.contractor_altrpIndex = altrpIndex
                        
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

  function OlapTabContent({
    olapTab,
    instance
  }: {
    olapTab: OLAPTab
    instance: any,
  }){
    return (<TabsContent value={olapTab.id} className="mt-4">
        <AdminStateProvider
          initialState={{
            collection: olapTab.collection,
            page: 1,
            pageSize: 10,
            filters: [{ field: olapTab.foreignKey, op: 'eq', value: instance[olapTab.localKey] as string }],
            search: "",
          }}
        >
        <DataTableWithLinkButton
          onLinkClick={() => {
            //todo: реализовать
          }}
        />
        </AdminStateProvider>
      </TabsContent>)
  }
  
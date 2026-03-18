import { OLAPTab } from "@/shared/collections/BaseCollection"

export interface InstanceDetailsProps{
    title?: string
    altrpIndex: string, 
    collectionName: string,
    instance: any,
    showTabsOnly?:boolean,
    activeTab?: string,
    olapTabs?: OLAPTab[]
    setActiveTab?: (value: string) => void
}
'use client'
import { InstanceDetails } from "@/packages/components/blocks-app/admin/instance-details/InstanceDetails"
import { OLAPSettings, OLAPTab } from "@/shared/collections/BaseCollection"


export default function AdminDetailsCollectionPageClient({
    instance,
    altrpIndex,
    title,
    olapTabs,
    collectionName,

}:{
    instance: any,
    altrpIndex: string,
    title: string,
    olapTabs: OLAPTab[] 
    collectionName: string

}) {
    return (
        <InstanceDetails
            altrpIndex={altrpIndex}
            instance={instance}
            collectionName={collectionName}
            title={title}
            showTabsOnly={false}
            olapTabs={olapTabs}
        />
    )
}
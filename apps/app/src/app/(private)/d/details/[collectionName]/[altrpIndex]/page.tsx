import { getInstanceService } from "@/shared/services/collection/getInstance"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import AdminDetailsCollectionPageClient from "./page.client"
import {  PROJECT_SETTINGS } from "@/settings"

export async function generateMetadata({ params }: { params: Promise<{ collectionName: string, altrpIndex: string }> }): Promise<Metadata> {
    const p = await params
    const {
        collectionName,
        altrpIndex
    } = p
    const result = await getInstanceService(collectionName, altrpIndex)
    if (!result) {
        return {
            title: 'Not Found'
        }
    }
    const { instance, collectionConfig } = result
    return {
        title: `${instance.title} ${collectionConfig.name}`
    }
}

export default async function AdminDetailsCollectionPage({ params }: { params: Promise<{ collectionName: string, altrpIndex: string }> }) {
    const p = await params
    const {
        collectionName,
        altrpIndex,
    } = p
    if (!collectionName || !altrpIndex) {
        console.error('collectionName or altrpIndex not found')
        notFound()
    }
    const result = await getInstanceService(collectionName, altrpIndex)
    if (!result || !result.instance) {
        console.error('result not found', collectionName, altrpIndex, result)
        notFound()
    }
    const { instance, collectionConfig, breadcrumbItems, title } = result

    const Olap = await collectionConfig.getOLAP({
        locale: PROJECT_SETTINGS.defaultLanguage
    })
    return (
        <div className="flex h-screen w-full overflow-hidden">
                    <main className="flex-1 overflow-y-auto p-4">
                        <AdminDetailsCollectionPageClient 
                        altrpIndex={altrpIndex} 
                        collectionName={collectionName}
                        instance={instance} 
                        olapTabs={Olap?.tabs || []}
                        title={title}/>
                    </main>
        </div>
    )
}
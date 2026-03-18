import BaseCollection from "@/shared/collections/BaseCollection";

export interface BreadcrumbItemObject { 
    label: string
    href?: string 
}

export interface InstanceServiceType{
    instance: any,
    collectionConfig: BaseCollection,
    breadcrumbItems: BreadcrumbItemObject[]
    title: string
}
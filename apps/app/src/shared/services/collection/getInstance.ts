import { getCollection } from "@/shared/collections/getCollection";
import { i18n } from "../i18n";
import { getRepository } from "@/shared/repositories/getRepository";
import { eq } from "drizzle-orm";
import { parseCollectionInstance } from "./parseCollectionInstance";
import { BreadcrumbItemObject, InstanceServiceType } from "./types";
import { withNotDeleted } from "@/shared/repositories/utils";

export async function getInstanceService(collectionName: string, altrpIndex: string, locale?: string): Promise<InstanceServiceType | null> {

    const collectionConfig = getCollection(collectionName)
    if (!collectionConfig) {
        throw new Error(await i18n.t('collection.not_found', locale))
    }
    const collectionAltrpIndex = collectionConfig.getAltrpIndex()
    if (!collectionAltrpIndex) {
        throw new Error(await i18n.t('collection.altrp_index_not_found', locale))
    }
    const repository = getRepository(collectionName, locale)
    const query = repository.getSelectQuery()

    // Check if schema has deletedAt field
    const deletedAtField = repository.schema.deletedAt

    let [instance] = await query
        .where(
            deletedAtField
                ? withNotDeleted(deletedAtField, eq(repository.schema[collectionAltrpIndex], altrpIndex))
                : eq(repository.schema[collectionAltrpIndex], altrpIndex)
        )
        .limit(1)
        .execute()

        
    instance = await parseCollectionInstance(instance, collectionConfig, locale)

    if (!instance) {
        return null
    }

    const breadcrumbItems: BreadcrumbItemObject[] = await collectionConfig.getBreadcrumbsItems()

    breadcrumbItems.push({
        href: `/admin/details/${collectionName}/${altrpIndex}`,
        label: `${instance.title || ''} ${collectionConfig.name || ''}`
    })

    return {
        instance,
        collectionConfig,
        breadcrumbItems,
        title: instance.title || instance.uuid
    }
}
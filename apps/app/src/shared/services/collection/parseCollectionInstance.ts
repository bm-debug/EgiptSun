import BaseCollection from "@/shared/collections/BaseCollection";
import BaseColumn from "@/shared/columns/BaseColumn";
 
    import { PROJECT_SETTINGS } from "@/settings";

export async function parseCollectionInstance(instance: any, collectionConfig: BaseCollection, locale?: string){
    if(! locale){
        locale = PROJECT_SETTINGS.defaultLanguage || 'en'
    }
    if(! instance){
        return instance
    }
    const result:any = {
        ...instance
    } 
    for(const key in collectionConfig){
        const field = collectionConfig[key as keyof BaseCollection] 
        
        if (!(field instanceof BaseColumn)) {
            continue
        }
        const options = field.options
        if (options.virtual && typeof options.value === 'function') {
            result[key] = await options.value(instance)    
            continue
        }
        if(options.type === 'json' && options.i18n && instance[key] instanceof Object){

            result[key] = instance[key][locale]
            continue
        }
        
    }
    return result
}
import  BaseColumn  from "@/shared/columns/BaseColumn";
import type { SortingState } from "@tanstack/react-table";
import { LANGUAGES } from "@/settings";

type LanguageCode = (typeof LANGUAGES)[number]["code"];
import { BreadcrumbItemObject } from "../services/collection/types";
import { i18n } from "../services/i18n";
import {PROJECT_SETTINGS} from '@/settings'

export default class BaseCollection {
    created_at = new BaseColumn({ hidden: true });
    updated_at = new BaseColumn({ hidden: true });
    deleted_at = new BaseColumn({ hidden: true });
    data_in = new BaseColumn({ hidden: true, type: 'json' });
    data_out = new BaseColumn({ hidden: true, type: 'json' });
    uuid = new BaseColumn({ hidden: true });
    id = new BaseColumn({ hidden: true });
    xaid = new BaseColumn({ hidden: true });
    order = new BaseColumn({ hidden: true });
    
    /**
     * Default sorting configuration for the collection.
     * Applied when no sorting is saved in localStorage.
     * Format: [{ id: 'columnName', desc: false }] for ASC, or [{ id: 'columnName', desc: true }] for DESC
     */
    __defaultSort: SortingState = [{ id: 'title', desc: false }];
    
    constructor(public name: string = 'base') {}

    /**
     * Parse raw database data according to column type configurations.
     * Automatically parses JSON fields and ignores virtual columns.
     * 
     * @param data - Single row object or array of row objects from database
     * @returns Parsed data with JSON fields converted to objects
     */
    parse<T = any>(data: T | T[]): T | T[] {
        if (Array.isArray(data)) {
            return data.map(row => this.parseRow(row)) as T[]
        }
        return this.parseRow(data) as T
    }

    /**
     * Parse a single row according to column type configurations.
     */
    private parseRow(row: any): any {
        if (!row || typeof row !== 'object') {
            return row
        }

        const parsed = { ...row }

        // Iterate through all properties of this collection instance
        for (const key in this) {
            const field = this[key]
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
            
            // Skip if not a BaseColumn instance
            if (!(field instanceof BaseColumn)) {
                continue
            }

            // Skip virtual columns (they don't exist in DB)
            if (field.options.virtual) {
                
                continue
            }

            // Parse JSON fields (only when value looks like JSON; plain strings are kept as-is)
            if (field.options.type === 'json' && (parsed[key] != null || parsed[camelKey] != null)) {
                const value = parsed[key] || parsed[camelKey]
                if (typeof value === 'string') {
                    const trimmed = value.trim()
                    // Only attempt parse if string looks like JSON (object or array)
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        try {
                            const parsedValue = JSON.parse(value)
                            parsed[key] = parsedValue
                            parsed[camelKey] = parsedValue
                        } catch (error) {
                            console.warn(`Failed to parse JSON field ${key} in collection ${this.name}:`, error)
                        }
                    }
                    // Plain text (e.g. "Суперадминистратор") is left unchanged
                }
            }
        }

        return parsed
    }
    async prepare(data: any): Promise<void> {
        for (const key in this) {
            if(this[key] instanceof BaseColumn) {

                data[key] = await this[key].prepare(data[key])
            }
        }
    }
    public getAltrpIndex(): string | null{
        
        for (const key in this) {
            if(this[key] instanceof BaseColumn) {
                if(this[key].getOption('altrpIndex')){
                    return key
                }
            }
        }
        return null
    }
    public async getBreadcrumbsItems():Promise<BreadcrumbItemObject[]>{
        return [
            { label: await i18n.t('breadcrumbs.admin_apnel') || "Admin Panel",
                 href: "/admin" },
        ]
    }

    async getOLAP(options: OLAPOptions): Promise<OLAPSettings | null> {
        return null
    }
}

export interface OLAPOptions  {
    locale?: LanguageCode
}

export interface OLAPTab {
    id: string
    collection: string
    localKey: string
    foreignKey: string
    label: string
}
export interface OLAPSettings {
    tabs: OLAPTab[]
}

  
  
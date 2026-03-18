import { LANGUAGES, PROJECT_SETTINGS } from "@/settings"
import BaseColumn from "../columns/BaseColumn";
import { generateAid } from "../generate-aid";
import { BreadcrumbItemObject } from "../services/collection/types";
import { i18n } from "../services/i18n";
import BaseCollection, { OLAPOptions, OLAPTab } from "./BaseCollection";
import Humans from "./humans";
import Deals from "./deals";

export default class Contractors extends BaseCollection {
    __title = 'Contractors';
    // Default sorting: by ID ascending (A-Z) instead of descending
    __defaultSort = [{ id: 'id', desc: false }];
    title = new BaseColumn({
        title: 'Название',
        type: 'json',
        i18n: true,
    });
    reg = new BaseColumn({
        type: 'text',
    });
    tin = new BaseColumn({
        type: 'text',
    });
    status_name = new BaseColumn({
        title: 'Статус',
        type: 'text',
        relation: {
            collection: 'taxonomy',
            valueField: 'name',
            labelField: 'title',
            filters: [{
                field: 'entity',
                op: 'eq',
                value: 'Contractor', // Entity value in DB is 'Contractor' (capitalized)
            }],
        },
    });
    city_name = new BaseColumn({
        title: 'Город',
        type: 'text',
        relation: {
            collection: 'taxonomy',
            valueField: 'name',
            labelField: 'title',
            filters: [{
                field: 'entity',
                op: 'eq',
                value: 'City', // Entity value in DB is 'City' (capitalized)
            }],
        },
    });
    order = new BaseColumn({
        title: 'Порядок',
        type: 'number',
        hiddenTable: true, // Hidden by default, but can be enabled in table settings
    });
    xaid = new BaseColumn({
        title: 'Проект',
        type: 'text',
        readOnly: true,
        hiddenTable: true,
    });
    media_id = new BaseColumn({
        title: 'Логотип',
        type: 'text',
    });
    type = new BaseColumn({
        hidden: true,
    });
    gin = new BaseColumn({
        hidden: true,
    });
    fts = new BaseColumn({
        hidden: true,
    });
    data_out = new BaseColumn({
        hidden: true,
        hiddenTable: true,
    });
    caid = new BaseColumn({
        altrpIndex: true,
        hidden: true,
        hooks: {
            beforeSave: (value, instance, context) => {
                if (instance.caid) {
                    return instance.caid;
                }
                instance.caid = generateAid('c');
            },
        },
    });

    public async getBreadcrumbsItems(): Promise<BreadcrumbItemObject[]> {
        return [
            {
                label: await i18n.t('breadcrumbs.admin_apnel'),
                href: "/admin"
            },

            {
                label: await i18n.t('breadcrumbs.contractors'), href: "/admin?c=contractors"
            },
        ]
    }

    async getTabs(options: OLAPOptions): Promise<OLAPTab[]>{
        const {
            locale= PROJECT_SETTINGS.defaultLanguage
        } = options
        return [
            {
                collection: 'humans',
                localKey: 'caid',
                foreignKey: 'dataIn.contractor_caid',
                label: await i18n.t('olap.contractors.contacts',locale),
                id: 'humans',
            },
            {
                id: 'deals',
                collection: 'deals',
                localKey: 'caid',
                foreignKey: 'dataIn.contractor_caid',
                label: await i18n.t('olap.contractors.deals',locale)
                
            },
        ]
    }
    async getOLAP(options: OLAPOptions){


        const tabs = await this.getTabs(options)
        
        const Olap = {
            tabs
        }
        return Olap
    }
}
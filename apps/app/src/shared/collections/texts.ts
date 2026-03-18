import BaseColumn from "../columns/BaseColumn";
import BaseCollection from "./BaseCollection";
import { generateAid } from "../generate-aid";

export default class Texts extends BaseCollection {
    __title = 'Тексты';
    title = new BaseColumn({
        type: 'json',
        title: 'Название',
        i18n: true,
    });
    /** Dropdown options: taxonomy rows with entity = 'text'. Create them in admin Taxonomy if empty. */
    type = new BaseColumn({
        title: 'Тип',
        relation: {
            collection: 'taxonomy',
            valueField: 'name',
            labelField: 'title',
            filters: [{ field: 'entity', op: 'eq', value: 'text' }],
        },
    });
    /** Dropdown options: taxonomy rows with entity = 'content'. Create them in admin Taxonomy if empty. */
    status_name = new BaseColumn({
        title: 'Статус',
        relation: {
            collection: 'taxonomy',
            valueField: 'name',
            labelField: 'title',
            filters: [{ field: 'entity', op: 'eq', value: 'content' }],
        },
    });
    is_public = new BaseColumn({    
        title: 'Публичный',
        type: 'boolean',
        hiddenTable: true,
    });
    content = new BaseColumn({
        type: 'json',
        title: 'Контент',
        defaultCell: 'не заполнено',
        fieldType: 'tiptap',
        i18n: true,
        hiddenTable: true,
    });
    'data_in.seo_title' = new BaseColumn({
        title: 'SEO заголовок',
        type: 'json',
        i18n: true,
        virtual: true,
        hiddenTable: true,
        value: (instance: any) => {
            const dataIn = typeof instance.data_in === 'string' ? (() => { try { return JSON.parse(instance.data_in); } catch { return {}; } })() : (instance.data_in || {});
            return dataIn.seo_title ?? {};
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) instance.data_in = {};
                instance.data_in.seo_title = value;
            },
        },
    });
    'data_in.seo_description' = new BaseColumn({
        title: 'SEO описание',
        type: 'json',
        i18n: true,
        virtual: true,
        hiddenTable: true,
        value: (instance: any) => {
            const dataIn = typeof instance.data_in === 'string' ? (() => { try { return JSON.parse(instance.data_in); } catch { return {}; } })() : (instance.data_in || {});
            return dataIn.seo_description ?? {};
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) instance.data_in = {};
                instance.data_in.seo_description = value;
            },
        },
    });
    'data_in.seo_keywords' = new BaseColumn({
        title: 'SEO ключевые слова',
        type: 'json',
        i18n: true,
        virtual: true,
        hiddenTable: true,
        value: (instance: any) => {
            const dataIn = typeof instance.data_in === 'string' ? (() => { try { return JSON.parse(instance.data_in); } catch { return {}; } })() : (instance.data_in || {});
            return dataIn.seo_keywords ?? {};
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) instance.data_in = {};
                instance.data_in.seo_keywords = value;
            },
        },
    });
    'data_in.slug' = new BaseColumn({
        title: 'ЧПУ',
        type: 'json',
        i18n: true,
        virtual: true,
        hiddenTable: true,
        value: (instance: any) => {
            const dataIn = typeof instance.data_in === 'string' ? (() => { try { return JSON.parse(instance.data_in); } catch { return {}; } })() : (instance.data_in || {});
            return dataIn.slug ?? {};
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) instance.data_in = {};
                instance.data_in.slug = value;
            },
        },
    });
    'data_in.images' = new BaseColumn({
        title: 'Изображения',
        type: 'json',
        fieldType: 'images',
        virtual: true,
        hiddenTable: true,
        value: async (instance: any) => {
            let dataIn: any = null;
            if (typeof instance.data_in === 'string') {
                try {
                    let parsed = JSON.parse(instance.data_in);
                    if (typeof parsed === 'string') {
                        try { parsed = JSON.parse(parsed); } catch {}
                    }
                    dataIn = parsed;
                } catch {
                    try { dataIn = JSON.parse(instance.data_in); } catch { return []; }
                }
            } else if (instance.data_in && typeof instance.data_in === 'object') {
                dataIn = instance.data_in;
            } else {
                return [];
            }
            if (dataIn?.images && Array.isArray(dataIn.images)) return dataIn.images;
            if (dataIn?.image) return Array.isArray(dataIn.image) ? dataIn.image : [dataIn.image];
            return [];
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) instance.data_in = {};
                instance.data_in.images = Array.isArray(value) ? value : (value ? [value] : []);
            }
        },
    });
    gin = new BaseColumn({
        type: 'json',
        hidden: true,
    });
    fts = new BaseColumn({
        type: 'text',
        hidden: true,
    });
    data_in = new BaseColumn({
        type: 'json',
        hidden: true,
    });
    constructor() {
        super('texts');
    }
}
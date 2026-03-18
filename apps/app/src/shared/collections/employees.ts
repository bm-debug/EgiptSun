import BaseColumn from "../columns/BaseColumn";
import BaseCollection from "./BaseCollection";
import { generateAid } from "../generate-aid";

export default class Employees extends BaseCollection {
    __title = 'Employees';

    email = new BaseColumn({
        type: 'email',
        hidden: true,
    });
    status_name = new BaseColumn({
        type: 'text',
        hidden: true,
    });
    media_id = new BaseColumn({
        type: 'text',
        hidden: true,
    });
    gin = new BaseColumn({
        type: 'json',
        hidden: true,
    });
    fts = new BaseColumn({
        type: 'text',
        hidden: true,
    });
    full_eaid = new BaseColumn({
        hidden: true,
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (instance.full_eaid) {
                    return
                }
                instance.full_eaid = generateAid('e')
            }
        }
    });
    eaid = new BaseColumn({
        hidden: true,
    });
    is_public = new BaseColumn({
        hidden: true,
    });
    
    haid = new BaseColumn({
        title: 'Human',
        defaultCell: 'Not Provided',
        relation: {
            collection: 'humans',
            valueField: 'haid',
            labelField: 'full_name',
        },
    });
    'data_in.location_laid' = new BaseColumn({
        title: 'Location',
        virtual: true,
        defaultCell: 'Not Provided',
        value: async (instance: any) => {
            // Parse data_in if it's a string
            if (typeof instance.data_in === 'string') {
                try {
                    const parsed = JSON.parse(instance.data_in)
                    return parsed?.location_laid || ''
                } catch {
                    return ''
                }
            }
            return instance.data_in?.location_laid || ''
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) {
                    instance.data_in = {};
                }
                instance.data_in.location_laid = value
                return instance.data_in
            }
        },
        relation: {
            collection: 'locations',
            valueField: 'laid',
            labelField: 'title',
        },
    });

    constructor() {
        super('employees');
    }
}
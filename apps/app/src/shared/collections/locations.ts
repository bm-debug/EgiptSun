import BaseColumn from "../columns/BaseColumn";
import BaseCollection from "./BaseCollection";
import { generateAid } from "../generate-aid";

export default class Locations extends BaseCollection {
    __title = 'Locations';

    'data_in.name' = new BaseColumn({
        type: 'text',
        title: 'Name',
        virtual: true,
        value: (instance: any) => {
            return instance.data_in?.name
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) {
                    instance.data_in = {};
                }
                instance.data_in.name = value
            }
        }
    });
    
    title = new BaseColumn({
        type: 'text',
        title: 'Title',
        required: true,
    });


    
    city = new BaseColumn({
        hidden: true,
    });
    full_laid = new BaseColumn({
        hidden: true,
    });
    type = new BaseColumn({
        hidden: true,
    });
    status_name = new BaseColumn({
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
    laid = new BaseColumn({
        hidden: true,
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (instance.laid) {
                    return
                }
                instance.laid = generateAid('l')
            }
        }
    });
    is_public = new BaseColumn({
        hidden: true,
    });
    
    constructor() {
        super('locations');
    }
}
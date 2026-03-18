import BaseColumn from "../columns/BaseColumn";
import { generateAid } from "../generate-aid";
import BaseCollection from "./BaseCollection";

export default class Deals extends BaseCollection {
    __title = 'Заказы';
    full_daid = new BaseColumn({
        hidden: true,
    });
    cycle = new BaseColumn({
        hidden: true,
    });
    status_name = new BaseColumn({
        hidden: true,
    }); 
    gin = new BaseColumn({
        hidden: true,
    });
    fts = new BaseColumn({
        hidden: true,
    });
    daid = new BaseColumn({
        title: 'Daid',
        type: 'text',
    });
    'data_in.total' = new BaseColumn({
        title: 'Итого',
        type: 'price',
        virtual: true,
        value: async (instance: any) => {
            if(typeof instance.data_in === 'string') {
                try {
                    const parsed = JSON.parse(instance.data_in)
                    return parsed?.total || 0;
                } catch {
                    return 0;
                }
            }

            return instance.data_in?.total || 0;
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.dataIn) {
                    instance.dataIn = {};
                }
                instance.dataIn.total = value;
            }
        },

    });
    
    constructor() {
        super('deals');
    }
}
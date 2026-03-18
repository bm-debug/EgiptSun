import BaseColumn from "../columns/BaseColumn";
import BaseCollection from "./BaseCollection";

export default class Relations extends BaseCollection {
    __title = 'Relations';
    'data_in.quantity' = new BaseColumn({
        title: 'Количество',
        virtual: true,
        defaultCell: '0',
        value: async (instance: any) => {
            return instance.data_in?.quantity || 0;
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) {
                    instance.data_in = {};
                }
                instance.data_in.quantity = Number(value) || 0;
            }
        }
    });
    'data_in.temp_quantity' = new BaseColumn({
        title: 'Временное количество',
        virtual: true,
        defaultCell: '0',
        value: async (instance: any) => {
            return instance.data_in?.temp_quantity || 0;
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) {
                    instance.data_in = {};
                }
                instance.data_in.temp_quantity = Number(value) || 0;
            }
        }
    });
    
    constructor() {
        super('relations');
    }
}
import BaseColumn from "../columns/BaseColumn";
import { generateAid } from "../generate-aid";
import BaseCollection from "./BaseCollection";

export default class DealProducts extends BaseCollection {
    __title = 'Заказы продуктов';
    full_daid = new BaseColumn({
        title: 'Заказ',
        relation:{
            collection: 'deals',
            valueField: 'daid',
            labelField: 'title',
        }
    });

    full_paid = new BaseColumn({
        title: 'Продукт',
        relation:{
            collection: 'products',
            valueField: 'paid',
            labelField: 'title.ru',
        }
    });
    status_name = new BaseColumn({
        hidden: true,
    })
    quantity = new BaseColumn({
        type: 'number',
        required: true,
        index: true,
        title: 'Количество продукта',
    });
    constructor() {
        super('deal_products');
    }
}
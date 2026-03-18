import BaseColumn from "../columns/BaseColumn";
import BaseCollection from "./BaseCollection";

export default class Taxonomy extends BaseCollection {
    __title = 'Таксономия';
    /** Entity select options come from this enum (not from DB). DB table only needs column "entity". */
    entity = new BaseColumn({
        type: 'enum',
        title: 'Сущность',
        enum: {
            values: [
                'products',
                'category',
                'text',
                'content',
                'texts',
                'base_moves',
                'wallet_transactions',
                'contractors.status_name',
                'contractors.city_name',
                'relations.MOVE_ITEM',
            ],
            labels: [
                'Продукты',
                'Категория',
                'Тип (тексты)',
                'Статус (контент)',
                'Новости',
                'Машины',
                'Транзакции кошелька',
                'Статус контрагентов',
                'Город контрагентов',
                'Тип движения товара',
            ],
        },
    });
    name = new BaseColumn({
        type: 'text',
        title: 'Имя',
    }) as any; // Override BaseCollection.name (string) with BaseColumn
    title = new BaseColumn({
        type: 'text',
        title: 'Название',
    });
    sort_order = new BaseColumn({
        type: 'number',
        title: 'Порядок сортировки',
    });
    constructor() {
        super('taxonomy');
    }
}


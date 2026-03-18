import BaseColumn from "../columns/BaseColumn";
import BaseCollection from "./BaseCollection";
import { generateAid } from "../generate-aid";

export default class BaseMoves extends BaseCollection {
    __title = 'Машины';

    status_name = new BaseColumn({
        title: 'Статус',
        relation: {
            collection: 'taxonomy',
            valueField: 'name',
            labelField: 'title',

            filters: [{
                field: 'entity',
                op: 'eq',
                value: 'base_moves',
            }],
        },
    });
    constructor() {
        super('base_moves');
    }
}
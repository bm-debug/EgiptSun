import BaseColumn from "../columns/BaseColumn";
import BaseCollection from "./BaseCollection";
import { SortingState } from "@tanstack/react-table";

export default class Goals extends BaseCollection {
    __title = 'Кампании';
    title = new BaseColumn({
        type: 'text',
        title: 'Название',
    });
    type = new BaseColumn({
        title: 'Тип',
        type: 'text',
        hidden: true,
        hiddenTable: true,
    });
    'data_in.type' = new BaseColumn({
        title: 'Тип',
        type: 'text',
        virtual: true,
        value: async (instance: any) => {
            if (typeof instance.data_in === 'string') {
                try {
                    const parsed = JSON.parse(instance.data_in);
                    return parsed?.type || '';
                } catch {
                    return '';
                }
            }
            return instance.data_in?.type || '';
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) {
                    instance.data_in = {};
                }
                instance.data_in.type = value;
            }
        },
    });
    status_name = new BaseColumn({
        defaultCell: 'Не указан',
        title: 'Статус',
        relation: {
            collection: 'taxonomy',
            valueField: 'name',
            labelField: 'title',
            filters: [{
                field: 'entity',
                op: 'eq',
                value: 'goals',
            }],
        },
    });
    'data_in.rewardPerReport' = new BaseColumn({
        title: 'Награда за отчет',
        type: 'number',
        virtual: true,
        value: async (instance: any) => {
            if (typeof instance.data_in === 'string') {
                try {
                    const parsed = JSON.parse(instance.data_in);
                    return parsed?.rewardPerReport || 0;
                } catch {
                    return 0;
                }
            }
            return instance.data_in?.rewardPerReport || 0;
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) {
                    instance.data_in = {};
                }
                instance.data_in.rewardPerReport = value;
            }
        },
    });
    'data_in.participantLimit' = new BaseColumn({
        title: 'Лимит участников',
        type: 'number',
        virtual: true,
        value: async (instance: any) => {
            if (typeof instance.data_in === 'string') {
                try {
                    const parsed = JSON.parse(instance.data_in);
                    return parsed?.participantLimit || 0;
                } catch {
                    return 0;
                }
            }
            return instance.data_in?.participantLimit || 0;
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) {
                    instance.data_in = {};
                }
                instance.data_in.participantLimit = value;
            }
        },
    });
    'data_in.totalBudget' = new BaseColumn({
        title: 'Итоговый бюджет',
        type: 'number',
        virtual: true,
        value: async (instance: any) => {
            if (typeof instance.data_in === 'string') {
                try {
                    const parsed = JSON.parse(instance.data_in);
                    return parsed?.totalBudget || 0;
                } catch {
                    return 0;
                }
            }
            return instance.data_in?.totalBudget || 0;
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) {
                    instance.data_in = {};
                }
                instance.data_in.totalBudget = value;
            }
        },
    });
    'data_in.gameId' = new BaseColumn({
        title: 'Игра',
        type: 'text',
        virtual: true,
        required: true,
        value: async (instance: any) => {
            if (typeof instance.data_in === 'string') {
                try {
                    const parsed = JSON.parse(instance.data_in);
                    return parsed?.gameId || '';
                } catch {
                    return '';
                }
            }
            return instance.data_in?.gameId || '';
        },
        hooks: {
            beforeSave: (value: any, instance: any) => {
                if (!instance.data_in) {
                    instance.data_in = {};
                }
                instance.data_in.gameId = value;
            }
        },
        relation: {
            collection: 'products',
            valueField: 'paid',
            labelField: 'title',
            filters: [
                {
                    field: 'data_in.owner',
                    op: 'eq',
                    value: '{{user.humanAid}}', // This will be replaced dynamically
                },
            ],
        },
    });
    'data_in.owner' = new BaseColumn({
        title: 'Владелец',
        type: 'text',
        virtual: true,
        hidden: true,
        hiddenTable: true,
        value: async (instance: any) => {
            if (typeof instance.data_in === 'string') {
                try {
                    const parsed = JSON.parse(instance.data_in);
                    return parsed?.owner || '';
                } catch {
                    return '';
                }
            }
            return instance.data_in?.owner || '';
        },
    });
    cycle = new BaseColumn({
        title: 'Cycle',
        type: 'text',
        hidden: true,
        hiddenTable: true,
    });
    gaid = new BaseColumn({
        title: 'ID',
    });
    full_gaid = new BaseColumn({
        title: 'Full gaid',
        type: 'text',
        hidden: true,
        hiddenTable: true,
    });
    parent_full_gaid = new BaseColumn({
        title: 'Parent full gaid',
        type: 'text',
        hidden: true,
        hiddenTable: true,
    });
    is_public = new BaseColumn({
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
    data_in = new BaseColumn({
        type: 'json',
        hidden: true,
    });
    override __defaultSort: SortingState = [{ id: 'title', desc: false }] as SortingState

    constructor() {
        super('goals');
    }
}

export const systemSeed = {
    __meta__: {
        name: "System Data",
        versions: [
            {
                version: "1.0.0",
                date: "2026-02-02",
                description: "Initial version",
            },
        ],
    },
    roles: [
        {
            uuid: "afbfa516-39fb-41aa-9cd0-a61c7f0b093f",
            name: "developer",
            title: "Разработчик",
            dataIn: {
                auth_redirect_url: '/d',
            },
            description: "Роль для разработчиков системы",
            is_system: 1,
            order: 100,
        },
        {
            uuid: "b2c3d4e5-40a6-42bb-9de1-b72d8e1c0940",
            name: "tester",
            title: "Тестер",
            dataIn: {
                auth_redirect_url: '/t',
            },
            description: "Роль для тестировщиков",
            is_system: 1,
            order: 200,
        },
        {
            uuid: "c3d4e5f6-51b7-43cc-0ef2-c83e9f2d1051",
            name: "Administrator",
            title: "Администратор",
            dataIn: {
                auth_redirect_url: '/a',
            },
            description: "Роль администратора системы",
            is_system: 1,
            order: 10,
        },
    ],

    taxonomy: [],

    settings: [
        // Scoring weights - веса для расчета скорингового балла
        
    ],
} as const


'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Settings, FileText, CheckCircle, Users } from 'lucide-react'

const features = [
    {
        icon: Settings,
        title: 'Гибкая настройка задач',
        description: 'Создавайте кастомные сценарии тестирования с различными типами заданий и требованиями',
    },
    {
        icon: FileText,
        title: 'Кастомные анкеты',
        description: 'Разрабатывайте собственные опросы и формы для сбора структурированной обратной связи',
    },
    {
        icon: CheckCircle,
        title: 'Валидация',
        description: 'Автоматическая проверка выполнения заданий и валидация отчетов тестеров',
    },
    {
        icon: Users,
        title: 'Целевая аудитория',
        description: 'Выбирайте тестеров по демографии, опыту игры и другим критериям для точного таргетинга',
    },
]

export default function DevelopersFeaturesSection() {
    return (
        <section className="px-4 py-16 md:py-32">
            <div className="mx-auto max-w-6xl space-y-12">
                <div className="text-center">
                    <h2 className="font-heading text-balance text-4xl font-semibold lg:text-5xl">
                        Возможности платформы
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                        Все инструменты для эффективного тестирования ваших игр
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map((feature) => {
                        const IconComponent = feature.icon
                        return (
                            <Card key={feature.title} className="flex flex-col">
                                <CardHeader>
                                    <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                                        <IconComponent className="size-6 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                                </CardHeader>
                                <CardContent className="flex-1 text-muted-foreground">
                                    <p>{feature.description}</p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

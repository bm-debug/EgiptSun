'use client'

import { Card, CardContent } from '@/components/ui/card'

const benefits = [
    {
        title: 'Экономия на QA-отделе',
        description: 'Сократите расходы на внутренний отдел тестирования, используя сообщество активных тестеров',
    },
    {
        title: 'Проверка гипотез на ранних стадиях',
        description: 'Получайте обратную связь от реальных игроков до релиза и вносите изменения на основе данных',
    },
    {
        title: 'Удобная выгрузка отчетов',
        description: 'Экспортируйте результаты тестирования в удобном формате для анализа и презентации',
    },
]

export default function WhyOnlyTestSection() {
    return (
        <section className="px-4 py-16 md:py-32 bg-muted/50">
            <div className="mx-auto max-w-6xl space-y-12">
                <div className="text-center">
                    <h2 className="font-heading text-balance text-4xl font-semibold lg:text-5xl">
                        Почему OnlyTest
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                        Преимущества для разработчиков игр
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {benefits.map((benefit) => (
                        <Card key={benefit.title} className="flex flex-col">
                            <CardContent className="pt-6">
                                <h3 className="mb-3 text-xl font-semibold">{benefit.title}</h3>
                                <p className="text-muted-foreground">{benefit.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}

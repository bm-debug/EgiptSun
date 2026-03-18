'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Star, Target, Award } from 'lucide-react'

const benefits = [
    {
        icon: Star,
        title: 'Доступ к Alpha/Beta версиям',
        description: 'Играй в игры до их официального релиза и будь первым, кто оценит новые возможности',
    },
    {
        icon: Target,
        title: 'Реальное влияние на разработку',
        description: 'Твое мнение влияет на геймдев. Разработчики учитывают твои отзывы и улучшают игры',
    },
    {
        icon: Award,
        title: 'Честные награды за качественные отчеты',
        description: 'Получай справедливое вознаграждение за каждый качественный отчет о тестировании',
    },
]

export default function BenefitsSection() {
    return (
        <section className="px-4 py-16 md:py-32 bg-muted/50">
            <div className="mx-auto max-w-6xl space-y-12">
                <div className="text-center">
                    <h2 className="font-heading text-balance text-4xl font-semibold lg:text-5xl">
                        Преимущества платформы
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                        Почему тестеры выбирают OnlyTest
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {benefits.map((benefit) => {
                        const IconComponent = benefit.icon
                        return (
                            <Card key={benefit.title} className="flex flex-col">
                                <CardHeader>
                                    <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                                        <IconComponent className="size-6 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold">{benefit.title}</h3>
                                </CardHeader>
                                <CardContent className="flex-1 text-muted-foreground">
                                    <p>{benefit.description}</p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

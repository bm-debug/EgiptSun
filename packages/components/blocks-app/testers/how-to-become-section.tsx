'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { UserPlus, CheckCircle, Rocket } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const steps = [
    {
        icon: UserPlus,
        title: 'Зарегистрируйся',
        description: 'Создай аккаунт на платформе и заполни профиль. Это займет всего пару минут.',
    },
    {
        icon: CheckCircle,
        title: 'Выбери игру',
        description: 'Просмотри доступные игры для тестирования и выбери ту, которая тебе интересна.',
    },
    {
        icon: Rocket,
        title: 'Начни тестировать',
        description: 'Выполни задание, найди баги или пройди опрос. Отправь отчет и получи награду.',
    },
]

export default function HowToBecomeSection() {
    return (
        <section className="px-4 py-16 md:py-32">
            <div className="mx-auto max-w-6xl space-y-12">
                <div className="text-center">
                    <h2 className="font-heading text-balance text-4xl font-semibold lg:text-5xl">
                        Как стать тестером
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                        Всего три простых шага до первых наград
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {steps.map((step, index) => {
                        const IconComponent = step.icon
                        return (
                            <Card key={step.title} className="flex flex-col">
                                <CardHeader className="flex flex-col items-center text-center">
                                    <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                                        <IconComponent className="size-8 text-primary" />
                                    </div>
                                    <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                        {index + 1}
                                    </div>
                                    <h3 className="text-xl font-semibold">{step.title}</h3>
                                </CardHeader>
                                <CardContent className="flex-1 text-center text-muted-foreground">
                                    <p>{step.description}</p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                <div className="text-center">
                    <Button asChild size="lg" className="rounded-lg">
                        <Link href="/register?role=tester">Начать сейчас</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}

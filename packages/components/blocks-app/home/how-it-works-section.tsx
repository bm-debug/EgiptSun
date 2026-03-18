'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Gamepad2, ClipboardList, FileText, Wallet } from 'lucide-react'

const steps = [
    {
        icon: Gamepad2,
        title: 'Выбери игру',
        description: 'Доступны проекты на ПК и Android',
    },
    {
        icon: ClipboardList,
        title: 'Выполни задание',
        description: 'Поиграй 30 минут, найди баг или пройди опрос',
    },
    {
        icon: FileText,
        title: 'Отправь отчет',
        description: 'Скриншот + короткий отзыв',
    },
    {
        icon: Wallet,
        title: 'Получи награду',
        description: 'Баллы начисляются на единый кошелёк экосистемы после проверки',
    },
]

export default function HowItWorksSection() {
    return (
        <section id="how-it-works" className="px-4 py-16 md:py-32">
            <div className="mx-auto max-w-6xl space-y-12">
                <div className="text-center">
                    <h2 className="font-heading text-balance text-4xl font-semibold lg:text-5xl">
                        Как это работает
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                        Всего несколько простых шагов до первых наград
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
            </div>
        </section>
    )
}

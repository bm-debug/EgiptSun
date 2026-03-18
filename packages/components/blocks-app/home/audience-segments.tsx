'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Settings2, Sparkles, Zap } from 'lucide-react'
import { ReactNode } from 'react'

export default function AudienceSegments() {
    return (
        <section className="py-16 md:py-32">
            <div className="@Container mx-auto max-w-5xl px-6">
                <div className="text-center">
                    <h2 className="font-heading text-balance text-4xl font-semibold lg:text-5xl">Для каждого — своя выгода</h2>
                </div>
                <div className="@min-4xl:max-w-full @min-4xl:grid-cols-3 mx-auto mt-8 grid max-w-sm gap-6 [--color-background:var(--color-muted)] [--color-card:var(--color-muted)] *:text-center md:mt-16 dark:[--color-muted:var(--color-zinc-900)]">
                    <Card className="group border-0 shadow-none">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <Zap
                                    className="size-6"
                                    aria-hidden
                                />
                            </CardDecorator>

                            <h3 className="mt-6 font-medium">Для Покупателей: Честная рассрочка без переплат</h3>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm mb-4">
                                Приобретайте нужные товары сейчас, оплачивая их стоимость частями. Без процентов, скрытых комиссий и штрафов. Получите одобрение онлайн за 60 минут.
                            </p>
                            <Link href="/consumers" className="text-sm text-primary hover:underline">
                                Рассчитать платеж →
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="group border-0 shadow-none">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <Sparkles
                                    className="size-6"
                                    aria-hidden
                                />
                            </CardDecorator>

                            <h3 className="mt-6 font-medium">Для Инвесторов: Инвестиции со смыслом</h3>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm mb-4">
                                Вкладывайте капитал в реальные торговые сделки, поддерживая экономику. Получайте доход на принципах разделения прибыли и отслеживайте рост портфеля в реальном времени.
                            </p>
                            <Link href="/investors" className="text-sm text-primary hover:underline">
                                Подробнее для инвесторов →
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="group border-0 shadow-none">
                        <CardHeader className="pb-3">
                            <CardDecorator>
                                <Settings2
                                    className="size-6"
                                    aria-hidden
                                />
                            </CardDecorator>

                            <h3 className="mt-6 font-medium">Для Партнеров: Рост продаж для вашего бизнеса</h3>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm mb-4">
                                Предложите вашим клиентам удобный способ оплаты и увеличьте средний чек. Простая интеграция, быстрые выплаты и доступ к новой платежеспособной аудитории.
                            </p>
                            <Link href="/partners" className="text-sm text-primary hover:underline">
                                Стать партнером →
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
    <div className="mask-radial-from-40% mask-radial-to-60% relative mx-auto size-36 duration-200 [--color-border:color-mix(in_oklab,var(--color-zinc-950)10%,transparent)] group-hover:[--color-border:color-mix(in_oklab,var(--color-zinc-950)20%,transparent)] dark:[--color-border:color-mix(in_oklab,var(--color-white)15%,transparent)] dark:group-hover:[--color-border:color-mix(in_oklab,var(--color-white)20%,transparent)]">
        <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:24px_24px] dark:opacity-50"
        />

        <div className="bg-background absolute inset-0 m-auto flex size-12 items-center justify-center border-l border-t">{children}</div>
    </div>
)


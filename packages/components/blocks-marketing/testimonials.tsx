'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function Testimonials() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-6xl space-y-8 px-6 md:space-y-16">
                <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center md:space-y-12">
                    <h2 className="text-4xl font-medium lg:text-5xl">Что говорят тестеры и разработчики</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-rows-2">
                    <Card className="grid grid-rows-[auto_1fr] gap-8 sm:col-span-2 sm:p-6 lg:row-span-2">
                        <CardHeader>
                            <div className="text-2xl font-bold">OnlyTest</div>
                        </CardHeader>
                        <CardContent>
                            <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                                <p className="text-xl font-medium">
                                    OnlyTest помог нам собрать качественный фидбек от реальных игроков на ранней стадии разработки. Это позволило нам исправить критические баги до релиза и значительно улучшить пользовательский опыт. Платформа удобная, а тестеры действительно заинтересованы в качестве.
                                </p>

                                <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                                    <Avatar className="size-12">
                                        <AvatarImage
                                            src="/images/avatar-placeholder.svg"
                                            alt="Алексей Соколов"
                                            height="400"
                                            width="400"
                                            loading="lazy"
                                        />
                                        <AvatarFallback>АС</AvatarFallback>
                                    </Avatar>

                                    <div>
                                        <cite className="text-sm font-medium">Алексей Соколов</cite>
                                        <span className="text-muted-foreground block text-sm">Lead Game Developer</span>
                                    </div>
                                </div>
                            </blockquote>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardContent className="h-full pt-6">
                            <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                                <p className="text-xl font-medium">
                                    Тестирую игры на OnlyTest уже несколько месяцев. Платформа удобная, задания понятные, а награды действительно приходят. Особенно нравится, что разработчики читают отзывы и учитывают мнение тестеров. Это не просто заработок, а реальная возможность повлиять на игры.
                                </p>

                                <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                                    <Avatar className="size-12">
                                        <AvatarImage
                                            src="/images/avatar-placeholder.svg"
                                            alt="Дмитрий Волков"
                                            height="400"
                                            width="400"
                                            loading="lazy"
                                        />
                                        <AvatarFallback>ДВ</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <cite className="text-sm font-medium">Дмитрий Волков</cite>
                                        <span className="text-muted-foreground block text-sm">Тестер</span>
                                    </div>
                                </div>
                            </blockquote>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="h-full pt-6">
                            <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                                <p>
                                    Отличная платформа для тестирования игр! Получил доступ к Beta версии новой RPG, нашел несколько багов и получил хорошее вознаграждение. Интерфейс интуитивный, все понятно даже новичку.
                                </p>

                                <div className="grid items-center gap-3 [grid-template-columns:auto_1fr]">
                                    <Avatar className="size-12">
                                        <AvatarImage
                                            src="/images/avatar-placeholder.svg"
                                            alt="Анна Петрова"
                                            height="400"
                                            width="400"
                                            loading="lazy"
                                        />
                                        <AvatarFallback>АП</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <cite className="text-sm font-medium">Анна Петрова</cite>
                                        <span className="text-muted-foreground block text-sm">Тестер</span>
                                    </div>
                                </div>
                            </blockquote>
                        </CardContent>
                    </Card>

                    <Card className="card variant-mixed">
                        <CardContent className="h-full pt-6">
                            <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                                <p>
                                    Используем OnlyTest для проведения CBT наших проектов. Гибкая настройка задач, качественные отчеты от тестеров и удобная аналитика. Это экономит нам время и деньги на QA-отделе.
                                </p>

                                <div className="grid grid-cols-[auto_1fr] gap-3">
                                    <Avatar className="size-12">
                                        <AvatarImage
                                            src="/images/avatar-placeholder.svg"
                                            alt="Игорь Морозов"
                                            height="400"
                                            width="400"
                                            loading="lazy"
                                        />
                                        <AvatarFallback>ИМ</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">Игорь Морозов</p>
                                        <span className="text-muted-foreground block text-sm">Game Producer</span>
                                    </div>
                                </div>
                            </blockquote>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}


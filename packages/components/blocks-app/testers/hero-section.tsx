'use client'

import React from 'react'
import Link from 'next/link'
import { type Variants } from 'motion/react'
import { Button } from '@/components/ui/button'
import { TextEffect } from '@/components/motion-primitives/text-effect'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { Gamepad2, Trophy, Star } from 'lucide-react'

const transitionVariants: { item: Variants } = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring' as const,
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
}

export default function TestersHeroSection() {
    return (
        <section className="overflow-hidden [--color-primary-foreground:var(--color-white)] [--color-primary:var(--color-green-600)]">
            <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-32 lg:pt-48">
                <div className="relative z-10 mx-auto max-w-4xl text-center">
                    <TextEffect
                        preset="fade-in-blur"
                        speedSegment={0.3}
                        as="h1"
                        className="font-heading text-balance text-5xl font-bold md:text-6xl">
                        Стань тестировщиком игр
                    </TextEffect>
                    <TextEffect
                        per="line"
                        preset="fade-in-blur"
                        speedSegment={0.3}
                        delay={0.5}
                        as="p"
                        className="mx-auto mt-6 max-w-2xl text-pretty text-lg">
                        Играй в новинки раньше всех, находи баги, делись мнением и получай награды за качественные отчеты
                    </TextEffect>

                    <AnimatedGroup
                        variants={{
                            Container: {
                                visible: {
                                    transition: {
                                        staggerChildren: 0.05,
                                        delayChildren: 0.75,
                                    },
                                },
                            },
                            item: transitionVariants.item,
                        }}
                        className="mt-12">
                        <div className="mx-auto flex flex-col gap-4 sm:flex-row sm:justify-center">
                            <Button asChild size="lg" className="rounded-lg">
                                <Link href="/register?role=tester">Стать тестером</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="rounded-lg">
                                <Link href="/games">Посмотреть игры</Link>
                            </Button>
                        </div>

                        <div className="mt-16 grid gap-6 sm:grid-cols-3">
                            <div className="flex flex-col items-center text-center">
                                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                                    <Gamepad2 className="size-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Доступ к новинкам</h3>
                                <p className="text-sm text-muted-foreground">Играй в Alpha и Beta версии до релиза</p>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                                    <Star className="size-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Влияй на разработку</h3>
                                <p className="text-sm text-muted-foreground">Твое мнение учитывается разработчиками</p>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                                    <Trophy className="size-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Получай награды</h3>
                                <p className="text-sm text-muted-foreground">Честное вознаграждение за каждый отчет</p>
                            </div>
                        </div>
                    </AnimatedGroup>
                </div>
            </div>
        </section>
    )
}

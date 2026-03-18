'use client'

import React from 'react'
import Link from 'next/link'
import { type Variants } from 'motion/react'
import { Button } from '@/components/ui/button'
import { TextEffect } from '@/components/motion-primitives/text-effect'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'

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

export default function DevelopersHeroSection() {
    return (
        <section className="overflow-hidden [--color-primary-foreground:var(--color-white)] [--color-primary:var(--color-green-600)]">
            <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-32 lg:pt-48">
                <div className="relative z-10 mx-auto max-w-4xl text-center">
                    <TextEffect
                        preset="fade-in-blur"
                        speedSegment={0.3}
                        as="h1"
                        className="font-heading text-balance text-5xl font-bold md:text-6xl">
                        Качественный фидбек от реальных игроков, а не ботов
                    </TextEffect>
                    <TextEffect
                        per="line"
                        preset="fade-in-blur"
                        speedSegment={0.3}
                        delay={0.5}
                        as="p"
                        className="mx-auto mt-6 max-w-2xl text-pretty text-lg">
                        Проводите FGT (Focus Group Tests) и CBT (Closed Beta Tests) с гибкими сценариями
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
                                <Link href="/login">Запустить тест</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="rounded-lg">
                                <Link href="/#how-it-works">Узнать больше</Link>
                            </Button>
                        </div>
                    </AnimatedGroup>
                </div>
            </div>
        </section>
    )
}

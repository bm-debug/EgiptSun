'use client'
import { Logo } from '@/components/misc/logo/logo'
import { Activity, Map as MapIcon, MessageCircle } from 'lucide-react'
import { createMap } from 'svg-dotted-map'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export default function FeaturesSection() {
    return (
        <section className="px-4 py-16 md:py-32">
            <div className="mx-auto max-w-5xl mb-12 text-center">
                <h2 className="font-heading text-balance text-4xl font-semibold lg:text-5xl">В основе нашей работы — прозрачность и доверие</h2>
            </div>
            <div className="mx-auto grid max-w-5xl border md:grid-cols-2">
                <div>
                    <div className="p-6 sm:p-12">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <MapIcon className="size-4" />
                            Возможности доступные везде
                        </span>

                        <p className="mt-8 text-2xl font-semibold">Машстабная география, работаем в 4 регионах России.</p>
                    </div>

                    <div
                        aria-hidden
                        className="relative">
                        <div className="absolute inset-0 z-10 m-auto size-fit">
                            <div className="rounded-(--radius) bg-background z-1 dark:bg-muted relative flex size-fit w-fit items-center gap-2 border px-3 py-1 text-xs font-medium shadow-md shadow-zinc-950/5">
                                <span className="text-lg">🇷🇺</span> Последнее подключение из Москвы
                            </div>
                            <div className="rounded-(--radius) bg-background absolute inset-2 -bottom-2 mx-auto border px-3 py-4 text-xs font-medium shadow-md shadow-zinc-950/5 dark:bg-zinc-900"></div>
                        </div>

                        <div className="relative overflow-hidden">
                            <div className="bg-radial z-1 to-background absolute inset-0 from-transparent to-75%"></div>
                            <Map />
                        </div>
                    </div>
                </div>
                <div className="overflow-hidden border-t bg-zinc-50 p-6 sm:p-12 md:border-0 md:border-l dark:bg-transparent">
                    <div className="relative z-10">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <MessageCircle className="size-4" />
                            Поддержка, которая всегда на связи
                        </span>

                        <p className="my-8 text-2xl font-semibold">Мы ценим каждого участника нашей экосистемы. Наша команда готова ответить на ваши вопросы и помочь на любом этапе вашего пути с Altrp.</p>
                    </div>
                    <div
                        aria-hidden
                        className="flex flex-col gap-8">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="flex size-5 rounded-full border">
                                    <Logo className="m-auto size-3" />
                                </span>
                                <span className="text-muted-foreground text-xs">Сб 22 фев</span>
                            </div>
                            <div className="rounded-(--radius) bg-background mt-1.5 w-3/5 border p-3 text-xs">Привет, у меня проблема с аккаунтом.</div>
                        </div>

                        <div>
                            <div className="rounded-(--radius) mb-1 ml-auto w-3/5 bg-blue-600 p-3 text-xs text-white">Конечно, я помогу вам решить эту проблему. Опишите, пожалуйста, что именно не работает.</div>
                            <span className="text-muted-foreground block text-right text-xs">Сейчас</span>
                        </div>
                    </div>
                </div>
                <div className="col-span-full border-y p-12">
                    <div className="text-center">
                        <h3 className="text-2xl font-semibold mb-4">Надежность и безопасность данных</h3>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Мы используем современные технологии для защиты ваших данных и средств. Платформа работает на защищенной инфраструктуре, обеспечивая стабильность и конфиденциальность.
                        </p>
                    </div>
                </div>
                <div className="relative col-span-full">
                    <div className="absolute z-10 max-w-lg px-6 pr-12 pt-6 md:px-12 md:pt-12">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Activity className="size-4" />
                            Полный контроль в личном кабинете
                        </span>

                        <p className="ml-8 my-8 max-w-2xl text-2xl font-semibold">
                        Отслеживайте каждую операцию<span className="text-muted-foreground">, график платежей и&nbsp;начисление прибыли</span>
                        </p>
                    </div>
                    <MonitoringChart />
                </div>
            </div>
        </section>
    )
}

const { points } = createMap({
    width: 120,
    height: 55,
    mapSamples: 5000,
})

const svgOptions = {
    backgroundColor: 'var(--color-background)',
    color: 'currentColor',
    radius: 0.15,
}

const Map = () => {
    const viewBox = `0 0 120 60`
    return (
        <svg
            viewBox={viewBox}
            style={{ background: svgOptions.backgroundColor }}>
            {points.map((point: any, index: any) => (
                <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={svgOptions.radius}
                    fill={svgOptions.color}
                />
            ))}
        </svg>
    )
}

const chartConfig = {
    desktop: {
        label: '2024',
        color: '#2563eb',
    },
    mobile: {
        label: '2025',
        color: '#60a5fa',
    },
} satisfies ChartConfig

const chartData = [
    { month: 'Июнь', desktop: 56, mobile: 224 },
    { month: 'Июль', desktop: 56, mobile: 224 },
    { month: 'Август', desktop: 126, mobile: 252 },
    { month: 'Сентябрь', desktop: 205, mobile: 410 },
    { month: 'Октябрь', desktop: 200, mobile: 126 },
    { month: 'Ноябрь', desktop: 400, mobile: 800 },
]

const MonitoringChart = () => {
    return (
        <ChartContainer
            className="h-120 aspect-auto md:h-96"
            config={chartConfig}>
            <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                    left: 20,
                    right: 10,
                    top: 10,
                    bottom: 30,
                }}>
                <defs>
                    <linearGradient
                        id="fillDesktop"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1">
                        <stop
                            offset="0%"
                            stopColor="var(--color-desktop)"
                            stopOpacity={0.8}
                        />
                        <stop
                            offset="55%"
                            stopColor="var(--color-desktop)"
                            stopOpacity={0.1}
                        />
                    </linearGradient>
                    <linearGradient
                        id="fillMobile"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1">
                        <stop
                            offset="0%"
                            stopColor="var(--color-mobile)"
                            stopOpacity={0.8}
                        />
                        <stop
                            offset="55%"
                            stopColor="var(--color-mobile)"
                            stopOpacity={0.1}
                        />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                />
                <ChartTooltip
                    active
                    cursor={false}
                    content={<ChartTooltipContent className="dark:bg-muted" />}
                />
                <Area
                    strokeWidth={2}
                    dataKey="mobile"
                    type="stepBefore"
                    fill="url(#fillMobile)"
                    fillOpacity={0.1}
                    stroke="var(--color-mobile)"
                    stackId="a"
                />
                <Area
                    strokeWidth={2}
                    dataKey="desktop"
                    type="stepBefore"
                    fill="url(#fillDesktop)"
                    fillOpacity={0.1}
                    stroke="var(--color-desktop)"
                    stackId="a"
                />
            </AreaChart>
        </ChartContainer>
    )
}
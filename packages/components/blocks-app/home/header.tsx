'use client'
import Link from 'next/link'
import { Logo } from '@/components/misc/logo/logo'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import React from 'react'
import { cn } from '@/lib/utils'
import { useMe } from '@/providers/MeProvider'
import { ChatTriggerButton } from '../chat'

const menuItems = [
    { name: 'Для тестеров', href: '/testers' },
    { name: 'Для разработчиков', href: '/developers' },
    { name: 'Игры', href: '/games' },
    { name: 'Блог', href: '/blog' },
]

export const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const { user } = useMe()

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const cabinetUrl = React.useMemo(() => {
        if (!user) return null
        const isAdmin = user.roles.some(
            (role) => role.name === 'Administrator' || role.name === 'admin'
        )
        const isConsumer = user.roles.some(
            (role) => role.name === 'Consumer' || role.name === 'Потребитель'
        )
        return isAdmin ? '/admin' : isConsumer ? '/c' : null
    }, [user])
    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="fixed z-20 w-full px-2">
                <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5')}>
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                        <div className="flex w-full justify-between lg:w-auto">
                            <Link
                                href="/"
                                aria-label="Главная"
                                className="flex items-center space-x-2">
                                <Logo className="h-6" />
                            </Link>

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState == true ? 'Закрыть меню' : 'Открыть меню'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>
                        </div>

                        <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                            <ul className="flex gap-8 text-sm">
                                {menuItems.map((item, index) => (
                                    <li key={index}>
                                        <Link
                                            href={item.href}
                                            className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                            <div className="lg:hidden">
                                <ul className="space-y-6 text-base">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {!user && (
                                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        className={cn(isScrolled && 'lg:hidden')}>
                                        <Link href="/login">
                                            <span>Войти</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="default"
                                        size="sm"
                                        className={cn(isScrolled && 'lg:hidden')}>
                                        <Link href="/register">
                                            <span>Регистрация</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="default"
                                        size="sm"
                                        className={cn('hidden', isScrolled && 'lg:inline-flex')}>
                                        <Link href="/register">
                                            <span>Регистрация</span>
                                        </Link>
                                    </Button>
                                </div>
                            )}
                            {cabinetUrl && (
                                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                    <ChatTriggerButton />
                                    <Button
                                        asChild
                                        variant="default"
                                        size="sm"
                                        className={cn(isScrolled && 'lg:hidden')}>
                                        <Link href={cabinetUrl}>
                                            <span>Личный кабинет</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="default"
                                        size="sm"
                                        className={cn('hidden', isScrolled && 'lg:inline-flex')}>
                                        <Link href={cabinetUrl}>
                                            <span>Личный кабинет</span>
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    )
}
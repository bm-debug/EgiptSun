'use client'
import React, { type ReactNode } from 'react'
import { motion, type Variants } from 'motion/react'

export type PresetType = 'fade' | 'slide' | 'scale' | 'blur' | 'blur-slide' | 'zoom' | 'flip' | 'bounce' | 'rotate' | 'swing'

export type AnimatedGroupProps = {
    children: ReactNode
    className?: string
    variants?: {
        Container?: Variants
        item?: Variants
    }
    preset?: PresetType
    as?: React.ElementType
    asChild?: React.ElementType
}

const defaultContainerVariants: Variants = {
    visible: {
        transition: {
            staggerChildren: 0.1,
        },
    },
}

const defaultItemVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
}

const presetVariants: Record<PresetType, Variants> = {
    fade: {},
    slide: {
        hidden: { y: 20 },
        visible: { y: 0 },
    },
    scale: {
        hidden: { scale: 0.8 },
        visible: { scale: 1 },
    },
    blur: {
        hidden: { filter: 'blur(4px)' },
        visible: { filter: 'blur(0px)' },
    },
    'blur-slide': {
        hidden: { filter: 'blur(4px)', y: 20 },
        visible: { filter: 'blur(0px)', y: 0 },
    },
    zoom: {
        hidden: { scale: 0.5 },
        visible: {
            scale: 1,
            transition: { type: 'spring', stiffness: 300, damping: 20 },
        },
    },
    flip: {
        hidden: { rotateX: -90 },
        visible: {
            rotateX: 0,
            transition: { type: 'spring', stiffness: 300, damping: 20 },
        },
    },
    bounce: {
        hidden: { y: -50 },
        visible: {
            y: 0,
            transition: { type: 'spring', stiffness: 400, damping: 10 },
        },
    },
    rotate: {
        hidden: { rotate: -180 },
        visible: {
            rotate: 0,
            transition: { type: 'spring', stiffness: 200, damping: 15 },
        },
    },
    swing: {
        hidden: { rotate: -10 },
        visible: {
            rotate: 0,
            transition: { type: 'spring', stiffness: 300, damping: 8 },
        },
    },
}

const addDefaultVariants = (variants: Variants) => ({
    hidden: { ...defaultItemVariants.hidden, ...variants.hidden },
    visible: { ...defaultItemVariants.visible, ...variants.visible },
})

function AnimatedGroup({ children, className, variants, preset, as = 'div', asChild = 'div' }: AnimatedGroupProps) {
    const selectedVariants = {
        item: addDefaultVariants(preset ? presetVariants[preset] : {}),
        Container: addDefaultVariants(defaultContainerVariants),
    }
    const ContainerVariants = variants?.Container || selectedVariants.Container
    const itemVariants = variants?.item || selectedVariants.item

    // Use conditional rendering with built-in motion components to avoid deprecated motion() function
    const getMotionComponent = (elementType: React.ElementType) => {
        if (elementType === 'div') return motion.div
        if (elementType === 'span') return motion.span
        if (elementType === 'section') return motion.section
        if (elementType === 'article') return motion.article
        if (elementType === 'header') return motion.header
        if (elementType === 'footer') return motion.footer
        if (elementType === 'main') return motion.main
        if (elementType === 'nav') return motion.nav
        if (elementType === 'aside') return motion.aside
        // Fallback to div for unknown types
        return motion.div
    }

    const MotionComponent = getMotionComponent(as)
    const MotionChild = getMotionComponent(asChild)

    return (
        <MotionComponent
            initial="hidden"
            animate="visible"
            variants={ContainerVariants}
            className={className}>
            {React.Children.map(children, (child, index) => (
                <MotionChild
                    key={index}
                    variants={itemVariants}>
                    {child}
                </MotionChild>
            ))}
        </MotionComponent>
    )
}

export { AnimatedGroup }

"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/misc/theme-toggle";
import { Container } from "@/components/misc/layout/сontainer";
import { usePublicContent } from "@/contexts/PublicContentContext";
import { PROJECT_SETTINGS } from "@/settings";
import { pageRoutes, pageGroups, socialLinks, slugFromRoute } from "@/packages/content/nav-config";

interface Footer00Props {
  className?: string;
}

const Footer00 = ({ className }: Footer00Props) => {
  const { header, footer } = usePublicContent();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterError, setNewsletterError] = useState("");
  const [newsletterSuccessOpen, setNewsletterSuccessOpen] = useState(false);
  const groupsMap = footer?.groups as Record<string, string> | undefined;
  const socialMap = footer?.social as Record<string, string> | undefined;
  const linkLabels = footer?.link_labels as Record<string, string> | undefined;
  const navLinksMap = header?.links as Record<string, string> | undefined;

  const slogan = (footer?.slogan as string) ?? "";
  const allRightsReserved = (footer?.all_rights_reserved as string) ?? "All rights reserved";
  const getSupport = (footer?.get_support as string) ?? "Get Support :";
  const newsletter = (footer?.newsletter as string) ?? "Sign up for newsletter :";
  const newsletterPlaceholder = (footer?.newsletter_placeholder as string) ?? "Enter email";
  const newsletterSuccessTitle = (footer?.newsletter_success_title as string) ?? "Subscribed";
  const newsletterSuccessDescription = (footer?.newsletter_success_description as string) ?? "You have been successfully added to the mailing list.";
  const newsletterOk = (footer?.newsletter_ok as string) ?? "OK";
  const newsletterErrorEmpty = (footer?.newsletter_error_empty as string) ?? "Enter your email";
  const newsletterErrorInvalid = (footer?.newsletter_error_invalid as string) ?? "Invalid email address";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterError("");
    const trimmed = newsletterEmail.trim();
    if (!trimmed) {
      setNewsletterError(newsletterErrorEmpty);
      return;
    }
    if (!emailRegex.test(trimmed)) {
      setNewsletterError(newsletterErrorInvalid);
      return;
    }
    setNewsletterEmail("");
    setNewsletterSuccessOpen(true);
  };

  const footerGroups = pageGroups.map((group) => {
    const groupTitle = groupsMap?.[group.key] ?? group.key;
    const items = group.pages
      .map((pageKey) => {
        const href = pageRoutes[pageKey];
        if (!href) return null;
        const label = navLinksMap?.[pageKey] ?? slugFromRoute(href);
        return { label, href };
      })
      .filter((item): item is { label: string; href: string } => item !== null);

    return {
      title: groupTitle,
      items,
    };
  }).filter((group) => group.items.length > 0);

  const FOOTER_LINKS = (["legal", "faq", "contacts"] as const)
    .map((pageKey) => {
      const href = pageRoutes[pageKey];
      if (!href) return null;
      const label = linkLabels?.[pageKey] ?? slugFromRoute(href);
      return { label, href };
    })
    .filter((item): item is { label: string; href: string } => item !== null);

  return (
    <section
      className={cn("dark bg-background py-16 text-foreground", className)}
    >
      <Container>
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          {/* Контакты */}
          <div className="space-y-4 text-left">
            <h3 className="text-base font-medium tracking-tight lg:text-lg">Контакты</h3>
            <ul className="space-y-2 text-sm font-light tracking-tight lg:text-base">
              <li>
                <a href="tel:+79055993377" className="hover:text-foreground/30">
                  +7 (905) 599 33 77
                </a>
              </li>
              <li>
                <p>105043, Москва, ул. Первомайская, 58Б ст1</p>
              </li>
              <li>
                <p>Ежедневно 10.00 - 22.00</p>
              </li>
            </ul>
          </div>

          {/* Правовая информация */}
          <div className="space-y-4 text-left">
            <h3 className="text-base font-medium tracking-tight lg:text-lg">Правовая информация</h3>
            <ul className="space-y-2 text-sm font-light tracking-tight lg:text-base">
              <li>
                <Link href="/privacy-policy" className="hover:text-foreground/30 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-use" className="hover:text-foreground/30 transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-foreground/30 transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>

          {/* Переключатель темы */}
          <div className="-ms-2 flex flex-wrap items-center gap-2 text-left">
            <ThemeToggle variant="minimal" size="sm" className="h-8 w-8 shrink-0" />
          </div>
        </div>

        {/* Копирайт */}
        <div className="mt-12 text-center text-sm font-light text-foreground/60">
          © {new Date().getFullYear()} Солнце Египта. Все права защищены
        </div>
      </Container>
    </section>
  );
};

export default Footer00;

const CenteredLogo = () => {
  const ContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const pathVariants: Variants = {
    hidden: {
      y: 60,
      opacity: 0,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <motion.svg
      width="271"
      height="107"
      viewBox="0 0 271 107"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      variants={ContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="w-full h-auto max-w-full"
    >
      <defs>
        <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="50%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="fadeMask">
          <rect width="100%" height="100%" fill="url(#fadeGradient)" />
        </mask>
      </defs>
      <g mask="url(#fadeMask)">
        <motion.path
          d="M29.5491 85.6C40.5108 85.6 46.9449 79.6556 47.8981 77.3967H48.2556V84.4111H66.7237V22.5889H48.2556V29.6033H47.8981C46.9449 27.3444 40.5108 21.4 29.5491 21.4C15.4894 21.4 0 31.9811 0 53.5C0 75.0189 15.4894 85.6 29.5491 85.6ZM18.2299 53.5C18.2299 43.5133 25.498 37.8067 33.3619 37.8067C41.464 37.8067 48.7322 43.3944 48.7322 53.5C48.7322 63.6056 41.464 69.1933 33.3619 69.1933C25.498 69.1933 18.2299 63.4867 18.2299 53.5Z"
          variants={pathVariants}
          fill="white"
        />
        <motion.path
          d="M77.9126 84.4111H96.3808V0H77.9126V84.4111Z"
          variants={pathVariants}
          fill="white"
        />
        <motion.path
          d="M133.558 85.1244C137.848 85.1244 143.09 84.2922 145.473 81.9144V67.8856C143.209 68.5989 141.065 68.8367 139.635 68.8367C134.035 68.8367 132.248 65.5078 132.248 62.4167V37.2122H145.235V22.5889H132.248V6.77667H113.779V22.5889H104.605V37.2122H113.779V65.3889C113.779 79.5367 122.12 85.1244 133.558 85.1244Z"
          variants={pathVariants}
          fill="white"
        />
        <motion.path
          d="M154.01 84.4111H172.478V58.9689C172.478 47.3178 179.508 39.1144 191.78 39.1144C193.329 39.1144 194.64 39.2333 196.07 39.4711V21.9944C194.521 21.5189 193.091 21.4 191.661 21.4C180.461 21.4 174.504 29.3656 172.478 39.3522V22.5889H154.01V84.4111Z"
          variants={pathVariants}
          fill="white"
        />
        <motion.path
          d="M204.276 107H222.744V77.3967H223.102C224.055 79.6556 230.489 85.6 241.451 85.6C255.511 85.6 271 75.0189 271 53.5C271 31.9811 255.511 21.4 241.451 21.4C230.489 21.4 224.055 27.3444 223.102 29.6033H222.744V22.5889H204.276V107ZM222.268 53.5C222.268 43.3944 229.536 37.8067 237.638 37.8067C245.502 37.8067 252.77 43.5133 252.77 53.5C252.77 63.4867 245.502 69.1933 237.638 69.1933C229.536 69.1933 222.268 63.6056 222.268 53.5Z"
          variants={pathVariants}
          fill="white"
        />
      </g>
    </motion.svg>
  );
};
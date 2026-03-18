"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { Container } from "@/components/misc/layout/сontainer";
import { Logo } from "@/components/misc/logo/logo";
import { ThemeToggle } from "@/components/misc/theme-toggle";
import { Button } from "@/components/ui/button";
import { usePublicContent } from "@/contexts/PublicContentContext";
import { pageRoutes, pageGroups, socialLinks, slugFromRoute } from "@/packages/content/nav-config";

type SubmenuKey = "main" | "products" | "technical" | "social" | null;

interface Navbar00Props {
  className?: string;
}

const Navbar00 = ({ className }: Navbar00Props) => {
  const { header } = usePublicContent();
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<SubmenuKey>(null);
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);

  useEffect(() => {
    if (open && typeof document !== "undefined") {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const groupsMap = header?.groups as Record<string, string> | undefined;
  const linksMap = header?.links as Record<string, string> | undefined;
  const socialMap = header?.social as Record<string, string> | undefined;

  const navGroups = pageGroups.map((group) => ({
    key: group.key,
    title: groupsMap?.[group.key] ?? group.key,
    items: group.pages
      .map((pageKey) => {
        const href = pageRoutes[pageKey];
        if (href === undefined) return null;
        const title = linksMap?.[pageKey] ?? slugFromRoute(href);
        return { title, href };
      })
      .filter((item): item is { title: string; href: string } => item !== null),
  }));

  const socialTitle = groupsMap?.social_networks ?? "Social Networks";
  const socialItems = socialLinks.map((item) => ({
    title: socialMap?.[item.id] ?? item.label,
    href: item.href,
  }));

  const loginLabel = (header?.login as string) ?? "Login";
  const startNowLabel = (header?.start_now as string) ?? "Start now";

  return (
    <section className={cn("sticky top-0 inset-x-0 z-20 bg-background", className)}>
      <Container>
        <div className="flex w-full items-center justify-between gap-12 py-4">
          {/* Logo */}
          <div>
            <Link href="/">
              <Logo className="h-7" />
            </Link>
          </div>

          <div className="hidden lg:flex flex-1 list-none items-center justify-center space-x-1">
            {navGroups.map((group) => (
              <div
                key={group.key}
                className="relative inline-block"
                onMouseEnter={() => setOpenDropdownKey(group.key)}
                onMouseLeave={() => setOpenDropdownKey(null)}
              >
                <button
                  type="button"
                  className="inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {group.title}
                  <ChevronDown className="ml-1 size-3 opacity-50 rtl:rotate-180" />
                </button>
                {openDropdownKey === group.key && (
                  <div className="absolute left-1/2 top-full z-50 mt-0 -translate-x-1/2 rounded-md border bg-popover p-4 text-popover-foreground shadow-md">
                    <div className="grid min-w-[320px] grid-cols-2 gap-x-6 gap-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        {item.title}
                      </Link>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div
              className="relative inline-block"
              onMouseEnter={() => setOpenDropdownKey("social")}
              onMouseLeave={() => setOpenDropdownKey(null)}
            >
              <button
                type="button"
                className="inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {socialTitle}
                <ChevronDown className="ml-1 size-3 opacity-50 rtl:rotate-180" />
              </button>
              {openDropdownKey === "social" && (
                <div className="absolute left-1/2 top-full z-50 mt-0 -translate-x-1/2 rounded-md border bg-popover p-4 text-popover-foreground shadow-md">
                  <div className="grid min-w-[160px] grid-cols-2 gap-1">
                    {socialItems.map((item) => (
                      <a
                        key={item.title}
                        href={item.href}
                        className="block cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        {item.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle variant="minimal" size="sm" className="h-9 w-9 shrink-0" />
            <Button variant="ghost" asChild>
              <Link href="/sign-in">{loginLabel}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sign-up">
                {startNowLabel}
                <ChevronRight className="size-4 rtl:rotate-180" />
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-4 lg:hidden">
              <Button
                variant="outline"
                size="icon"
                aria-label="Main Menu"
                onClick={() => {
                  if (open) {
                    setOpen(false);
                    setSubmenu(null);
                  } else {
                    setOpen(true);
                  }
                }}
              >
                {!open && <Menu className="size-4" />}
                {open && <X className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu (Root) */}
          {open && !submenu && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-y-auto overscroll-contain border-t border-border bg-background lg:hidden">
              <div>
                {navGroups.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    className="flex w-full items-center border-b border-border px-8 py-7 text-left"
                    onClick={() => setSubmenu(group.key === "main" ? "main" : group.key === "Products" ? "products" : "technical")}
                  >
                    <span className="flex-1">{group.title}</span>
                    <span className="shrink-0">
                      <ChevronRight className="size-4 rtl:rotate-180" />
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className="flex w-full items-center border-b border-border px-8 py-7 text-left"
                  onClick={() => setSubmenu("social")}
                >
                  <span className="flex-1">{socialTitle}</span>
                  <span className="shrink-0">
                    <ChevronRight className="size-4 rtl:rotate-180" />
                  </span>
                </button>
              </div>
              <div className="mx-[2rem] mt-auto flex flex-col gap-4 py-12">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <ThemeToggle variant="minimal" size="md" />
                </div>
                <Button variant="outline" className="relative" size="lg" asChild>
                  <Link href="/sign-in">{loginLabel}</Link>
                </Button>
                <Button className="relative" size="lg" asChild>
                  <Link href="/sign-up">{startNowLabel}</Link>
                </Button>
              </div>
            </div>
          )}
          {/* Mobile Menu > Main / Products / Technical */}
          {open && submenu && submenu !== "social" && (() => {
            const group = navGroups.find(
              (g) =>
                (submenu === "main" && g.key === "main") ||
                (submenu === "products" && g.key === "Products") ||
                (submenu === "technical" && g.key === "Technical")
            );
            if (!group) return null;
            return (
              <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-y-auto overscroll-contain border-t border-border bg-background lg:hidden">
                <Button
                  variant="outline"
                  className="m-4 w-fit"
                  onClick={() => setSubmenu(null)}
                >
                  <ChevronLeft className="mr-2 size-4 rtl:rotate-180" />
                  Back
                </Button>
                <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                  {group.title}
                </div>
                <div>
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex w-full items-center border-t border-border px-8 py-7 text-left hover:bg-accent"
                      onClick={() => setOpen(false)}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* Mobile Menu > Social Networks */}
          {open && submenu === "social" && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-y-auto overscroll-contain border-t border-border bg-background lg:hidden">
              <Button
                variant="outline"
                className="m-4 w-fit"
                onClick={() => setSubmenu(null)}
              >
                <ChevronLeft className="mr-2 size-4 rtl:rotate-180" />
                Back
              </Button>
              <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                {socialTitle}
              </div>
              <div>
                {socialItems.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    className="flex w-full items-center border-t border-border px-8 py-7 text-left hover:bg-accent"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          )}
      </Container>
    </section>
  );
};

export { Navbar00 };

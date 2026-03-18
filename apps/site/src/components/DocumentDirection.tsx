"use client";

import { useEffect, type ReactNode } from "react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { RTL_LOCALES } from "@/settings";

type DocumentDirectionProps = {
  locale: string;
  children: ReactNode;
};

export function DocumentDirection({ locale, children }: DocumentDirectionProps) {
  const isRtl = RTL_LOCALES.includes(locale);
  const dir = isRtl ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale, dir]);

  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}

"use client";

import { PROJECT_SETTINGS } from "@/settings";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useTheme } from "@/packages/hooks/use-theme";

interface LogoProps {
  className?: string
  collapsed?: boolean
  size?: "small" | "large"
}

export function Logo({ className }: LogoProps) {
  const { theme } = useTheme();
  // Extract height class if present
  const hasHeight = className?.match(/h-[\d]+/);
  
  const v = PROJECT_SETTINGS.logoVersion ?? 1;
  const logoSrc = theme === "dark" ? `/images/logo_dark.svg?v=${v}` : `/images/logo.svg?v=${v}`;
  
  // Check if justify class is provided in className
  const hasJustify = className?.match(/justify-(start|end|center|between|around|evenly)/);
  
  return (
    <div className={cn(
      "flex items-center",
      hasJustify ? "" : "justify-center",
      !hasHeight && "h-16 max-w-none",
      className
    )}>
      <Image 
        src={logoSrc}
        alt={PROJECT_SETTINGS.name} 
        width={240} 
        height={80}
        priority
        className={cn(
          "object-contain",
          "h-full w-auto max-w-full"
        )}
      />
    </div>
  );
}

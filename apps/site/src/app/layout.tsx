import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { Unbounded } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { PROJECT_SETTINGS } from "@/settings";

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
const fontSerif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  preload: true,
  fallback: ["ui-serif", "serif"],
});
const fontMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  preload: true,
  fallback: ["ui-monospace", "monospace"],
});
const fontHeading = Unbounded({
  variable: "--font-heading",
  subsets: ["latin", "cyrillic"],
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const fontClassNames = [fontSans.variable, fontSerif.variable, fontMono.variable, fontHeading.variable].join(" ");

export const metadata: Metadata = {
  metadataBase: new URL('https://altrp.org'),
  title: PROJECT_SETTINGS.name,
  description: PROJECT_SETTINGS.description,
  keywords: [
    "SMB platform",
    "digital foundation",
    "headless CMS",
    "e-commerce",
    "CRM",
    "LMS",
    "AI agents",
    "API-first",
    "business automation",
    "no-code",
    "low-code",
  ],
  openGraph: {
    type: "website",
    siteName: PROJECT_SETTINGS.name,
    locale: "ru_RU",
    url: "https://altrp.org",
    title: `${PROJECT_SETTINGS.name} — ${PROJECT_SETTINGS.description}`,
    description: PROJECT_SETTINGS.description,
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: PROJECT_SETTINGS.name,
      },
    ],
  },
  authors: [
    {
      name: PROJECT_SETTINGS.name,
      url: "https://altrp.org",
    },
  ],
  creator: PROJECT_SETTINGS.name,
  icons: [
    {
      rel: "icon",
      url: "/images/favicon.png",
    },
  ],
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="/images/logo.svg" as="image" type="image/svg+xml" />
        <link rel="preload" href="/images/logo_dark.svg" as="image" type="image/svg+xml" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#82181A" />
        <meta name="color-scheme" content="light dark" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={PROJECT_SETTINGS.name} />
      </head>

      <body className={`${fontClassNames} antialiased font-sans`} suppressHydrationWarning>
          <ThemeProvider attribute="class" defaultTheme={PROJECT_SETTINGS.defaultTheme} enableSystem={false}>
            {children}
          </ThemeProvider>
      </body>
    </html>
  );
}

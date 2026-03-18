import { LANGUAGES, PROJECT_SETTINGS } from '@/settings';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


const locales = LANGUAGES.map(l=>l.code);
const defaultLocale = PROJECT_SETTINGS.defaultLanguage; 

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect default locale to path without locale
  if (pathname === `/${defaultLocale}`) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  if (pathname.startsWith(`/${defaultLocale}/`)) {
    const pathWithoutLocale = pathname.slice(`/${defaultLocale}`.length);
    return NextResponse.redirect(new URL(pathWithoutLocale || '/', request.url));
  }

  // Check if pathname already has a non-default locale
  const pathnameHasNonDefaultLocale = locales.some(
    (locale) => locale !== defaultLocale && (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`)
  );

  // If non-default locale is present, continue as normal
  if (pathnameHasNonDefaultLocale) {
    return;
  }

  // If no locale, add default locale via rewrite (internal, URL stays the same)
  request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.rewrite(request.nextUrl);
}

export const config = {
  matcher: ['/((?!api|images|site.webmanifest|_next/static|_next/image|favicon.ico).*)'],
};
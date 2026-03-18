import { NextRequest, NextResponse } from 'next/server'
import { LANGUAGES } from '@/settings'

// For static export, we need to configure this route
export const dynamic = 'force-static'

export async function generateStaticParams() {
  // Return supported locales for static generation
  return LANGUAGES.map((l) => ({ locale: l.code }))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  try {
    const { locale: rawLocale } = await params
    const locale = (rawLocale || '').toLowerCase()
    
    const supported = LANGUAGES.map((l) => l.code.toLowerCase())
    if (!supported.includes(locale)) {
      return NextResponse.json(
        { error: `Invalid locale. Supported locales: ${supported.join(', ')}` },
        { status: 400 }
      )
    }

    // Use dynamic import to load JSON files
    let translations
    try {
      try {
        const module = await import(`@/packages/content/locales/${locale}.json`)
        translations = module.default || module
      } catch {
        // Fallback to English if locale file is missing
        const module = await import('@/packages/content/locales/en.json')
        translations = module.default || module
      }
      
      return NextResponse.json(translations, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      })
    } catch (fileError) {
      console.error(`Failed to import locale file for ${locale}:`, fileError)
      return NextResponse.json(
        { error: 'Locale file not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error in locales API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


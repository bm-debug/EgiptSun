import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LANGUAGES } from "@/settings"
import { SettingsRepository } from "@/shared/repositories/settings.repository"
import { TextsRepository } from "@/shared/repositories/texts.repository"

interface PageProps {
  params: Promise<{ locale: string; slug?: string[] }>
}

function getSlugPath(segments?: string[]): string {
  if (!segments || segments.length === 0) return ""
  return segments.join("/")
}

async function getPublicTextBySlug(slugPath: string) {
  if (!slugPath) return null
  const repo = TextsRepository.getInstance()
  const text = await repo.findBySlug(slugPath)
  if (!text) return null
  if (text.statusName !== "PUBLISHED") return null
  if (text.isPublic === false) return null
  return text
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const isLocale = LANGUAGES.some((l) => l.code === locale)
  const effectiveSlug = isLocale ? slug : [locale, ...(slug ?? [])]
  const slugPath = getSlugPath(effectiveSlug)
  const text = await getPublicTextBySlug(slugPath)
  if (!text) return {}
  return {
    title: text.title ?? slugPath,
    description: text.title ?? undefined,
  }
}

export default async function PublicDynamicPage({ params }: PageProps) {
  const { locale, slug } = await params
  const isLocale = LANGUAGES.some((l) => l.code === locale)
  const settingsRepo = SettingsRepository.getInstance()
  const pathFromUrl = "/" + [locale, ...(slug ?? [])].join("/")
  const pathWithoutLocale = slug?.length ? "/" + slug.join("/") : ""
  const cabinetPath = isLocale ? pathWithoutLocale : pathFromUrl
  const setting = cabinetPath
    ? await settingsRepo.findByRoleSchemaBaseUrl(cabinetPath)
    : null
  if (setting?.attribute) {
    const roleName = setting.attribute.startsWith("role_schema_")
      ? setting.attribute.slice("role_schema_".length)
      : setting.attribute
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-semibold">Cabinet: {roleName}</h1>
          <p className="text-muted-foreground">Path: {cabinetPath}</p>
          <p className="text-sm text-muted-foreground">
            Stub — cabinet UI not yet implemented.
          </p>
        </div>
      </div>
    )
  }

  const effectiveSlug = isLocale ? slug : [locale, ...(slug ?? [])]
  const slugPath = getSlugPath(effectiveSlug)
  const text = await getPublicTextBySlug(slugPath)
  if (!text) notFound()

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="space-y-6">
        {text.title && (
          <h1 className="text-3xl font-semibold tracking-tight">{text.title}</h1>
        )}
        {text.content ? (
          <div
            className="prose max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: text.content }}
          />
        ) : (
          <p className="text-muted-foreground">No content</p>
        )}
      </div>
    </div>
  )
}

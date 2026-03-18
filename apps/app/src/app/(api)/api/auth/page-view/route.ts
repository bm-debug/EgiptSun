import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/shared/session"
import { JournalsRepository } from "@/shared/repositories/journals.repository"

type PageViewBody = {
  pathname?: string
  search?: string
  url?: string
  referrer?: string
  userAgent?: string
  sessionUuid?: string
}

export async function POST(request: NextRequest) {
  const authSecret = process.env.AUTH_SECRET
  if (!authSecret) {
    return new Response(null, { status: 204 })
  }

  const session = await getSession(request, authSecret)
  if (!session?.id) {
    return new Response(null, { status: 204 })
  }

  const body = (await request.json().catch(() => ({}))) as PageViewBody

  try {
    const journalsRepository = JournalsRepository.getInstance()
    await journalsRepository.log({
      context: "page-view",
      step: "USER_PAGE_VIEW",
      status: "info",
      message: "Page view",
      payload: {
        pathname: body.pathname || null,
        search: body.search || null,
        url: body.url || null,
        referrer: body.referrer || request.headers.get("referer") || null,
        userAgent: body.userAgent || request.headers.get("user-agent") || null,
        sessionUuid: body.sessionUuid || session.sessionUuid || null,
      },
      userId: Number(session.id),
    })
  } catch (e) {
    // Do not break the app on logging failures
    console.error("Failed to log page view:", e)
  }

  return NextResponse.json({ success: true }, { status: 200 })
}



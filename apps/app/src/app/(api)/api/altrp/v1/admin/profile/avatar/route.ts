import { NextRequest, NextResponse } from "next/server"
import { withAdminGuard, type AuthenticatedRequestContext } from "@/shared/api-guard"
import { MeRepository } from "@/shared/repositories/me.repository"
import { HumanRepository } from "@/shared/repositories/human.repository"
import { FileStorageService } from "@/shared/services/storage/file-storage.service"
import type { ClientDataIn } from "@/shared/types/altrp"

function parseHumanDataIn(dataIn: unknown): ClientDataIn & Record<string, any> {
  if (!dataIn) return {}
  if (typeof dataIn === "string") {
    try {
      return JSON.parse(dataIn) as ClientDataIn & Record<string, any>
    } catch {
      return {}
    }
  }
  if (typeof dataIn === "object") return dataIn as ClientDataIn & Record<string, any>
  return {}
}

async function handlePost(context: AuthenticatedRequestContext, request: NextRequest): Promise<Response> {
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", message: "File is required" },
      { status: 400 },
    )
  }

  const meRepository = MeRepository.getInstance()
  const userWithRoles = await meRepository.findByIdWithRoles(Number(context.user.id), { includeHuman: true })
  const human = userWithRoles?.human

  if (!human) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND", message: "Human profile not found" },
      { status: 404 },
    )
  }

  const fileStorageService = FileStorageService.getInstance()
  const media = await fileStorageService.uploadFile(
    file,
    human.uuid,
    file.name,
    human.haid,
    true, // isPublic
  )

  const currentDataIn = parseHumanDataIn(human.dataIn)
  const nextDataIn: ClientDataIn & Record<string, any> = {
    ...currentDataIn,
    avatarMedia: {
      uuid: media.uuid,
      fileName: media.fileName,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      url: media.url,
      isPublic: media.isPublic,
    },
  }

  const humanRepository = HumanRepository.getInstance()
  await humanRepository.update(human.uuid, { dataIn: nextDataIn as any })

  return NextResponse.json(
    { success: true, avatarMediaUuid: media.uuid },
    { status: 200 },
  )
}

async function handleDelete(context: AuthenticatedRequestContext): Promise<Response> {
  const meRepository = MeRepository.getInstance()
  const userWithRoles = await meRepository.findByIdWithRoles(Number(context.user.id), { includeHuman: true })
  const human = userWithRoles?.human

  if (!human) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND", message: "Human profile not found" },
      { status: 404 },
    )
  }

  const currentDataIn = parseHumanDataIn(human.dataIn)
  const nextDataIn: ClientDataIn & Record<string, any> = { ...currentDataIn }
  delete (nextDataIn as any).avatarMedia

  const humanRepository = HumanRepository.getInstance()
  await humanRepository.update(human.uuid, { dataIn: nextDataIn as any })

  return NextResponse.json({ success: true }, { status: 200 })
}

export async function POST(request: NextRequest) {
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handlePost(ctx, request)
  })(request)
}

export async function DELETE(request: NextRequest) {
  return withAdminGuard(async (ctx: AuthenticatedRequestContext) => {
    return handleDelete(ctx)
  })(request)
}



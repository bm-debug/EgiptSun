import { NextResponse } from "next/server"
import { withAdminGuard, type AuthenticatedRequestContext } from "@/shared/api-guard"
import { MeRepository } from "@/shared/repositories/me.repository"
import { HumanRepository } from "@/shared/repositories/human.repository"
import type { ClientDataIn } from "@/shared/types/altrp"

type UpdateAdminProfileRequest = {
  firstName?: string
  lastName?: string
  middleName?: string
}

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

const handleGet = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const meRepository = MeRepository.getInstance()
  const userWithRoles = await meRepository.findByIdWithRoles(Number(context.user.id), { includeHuman: true })
  const human = userWithRoles?.human

  if (!human) {
    return NextResponse.json(
      { success: false, error: "NOT_FOUND", message: "Human profile not found" },
      { status: 404 },
    )
  }

  const dataIn = parseHumanDataIn(human.dataIn)
  const avatarMediaUuid = (dataIn as any)?.avatarMedia?.uuid as string | undefined

  return NextResponse.json(
    {
      success: true,
      profile: {
        id: context.user.id,
        uuid: context.user.uuid,
        email: context.user.email,
        name: human.fullName || context.user.email,
        firstName: (dataIn as any)?.firstName || undefined,
        lastName: (dataIn as any)?.lastName || undefined,
        middleName: (dataIn as any)?.middleName || undefined,
        avatarMediaUuid,
      },
    },
    { status: 200 },
  )
}

const handlePut = async (context: AuthenticatedRequestContext): Promise<Response> => {
  const { request } = context
  const body = (await request.json()) as UpdateAdminProfileRequest

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
  const nextDataIn: ClientDataIn & Record<string, any> = {
    ...currentDataIn,
    ...(body.firstName !== undefined && { firstName: body.firstName.trim() }),
    ...(body.lastName !== undefined && { lastName: body.lastName.trim() }),
    ...(body.middleName !== undefined && { middleName: body.middleName.trim() || undefined }),
  }

  const fullNameParts = [
    (nextDataIn as any)?.lastName || "",
    (nextDataIn as any)?.firstName || "",
    (nextDataIn as any)?.middleName || "",
  ]
    .map((s) => String(s).trim())
    .filter(Boolean)

  const nextFullName = fullNameParts.join(" ") || human.fullName

  const humanRepository = HumanRepository.getInstance()
  const updatedHuman = await humanRepository.update(human.uuid, {
    fullName: nextFullName,
    dataIn: nextDataIn as any,
  })

  const updatedDataIn = parseHumanDataIn(updatedHuman.dataIn)
  const avatarMediaUuid = (updatedDataIn as any)?.avatarMedia?.uuid as string | undefined

  return NextResponse.json(
    {
      success: true,
      profile: {
        id: context.user.id,
        uuid: context.user.uuid,
        email: context.user.email,
        name: updatedHuman.fullName || context.user.email,
        firstName: (updatedDataIn as any)?.firstName || undefined,
        lastName: (updatedDataIn as any)?.lastName || undefined,
        middleName: (updatedDataIn as any)?.middleName || undefined,
        avatarMediaUuid,
      },
    },
    { status: 200 },
  )
}

export const GET = withAdminGuard(handleGet)
export const PUT = withAdminGuard(handlePut)



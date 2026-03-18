/// <reference types="@cloudflare/workers-types" />

import { NextResponse } from "next/server"
import { UsersRepository } from "@/shared/repositories/users.repository"
import { buildRequestEnv } from "@/shared/env"
import { clearSession, isSecureRequest } from "@/shared/session"
import { verifyEmailChangeToken } from "@/shared/services/email-change.service"

type ConfirmEmailChangeRequest = {
  userUuid?: string
  token?: string
}

export async function POST(request: Request) {
  const env = buildRequestEnv()

  try {
    const body = (await request.json()) as ConfirmEmailChangeRequest
    const userUuid = (body.userUuid || "").trim()
    const token = (body.token || "").trim()

    if (!userUuid || !token) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Invalid request" },
        { status: 400 },
      )
    }

    const usersRepository = UsersRepository.getInstance()
    const user = await usersRepository.findByUuid(userUuid)
    if (!user) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "User not found" },
        { status: 404 },
      )
    }

    const { newEmail } = await verifyEmailChangeToken(user as any, token)

    const existing = await usersRepository.findByEmail(newEmail)
    if (existing && existing.uuid !== user.uuid) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Email already in use" },
        { status: 400 },
      )
    }

    const currentDataIn =
      typeof (user as any).dataIn === "string"
        ? (() => {
            try {
              return JSON.parse((user as any).dataIn)
            } catch {
              return {}
            }
          })()
        : ((user as any).dataIn || {})

    const nextDataIn = { ...currentDataIn }
    delete (nextDataIn as any).emailChange

    await usersRepository.update(user.uuid, {
      email: newEmail,
      emailVerifiedAt: new Date(),
      dataIn: nextDataIn,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Force re-login (session contains old email)
        "Set-Cookie": clearSession({
          secure: isSecureRequest(request),
          sameSite: "Lax",
        }),
      },
    })
  } catch (error) {
    console.error("Confirm email change error:", error)
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", message: "Confirmation failed" },
      { status: 400 },
    )
  }
}



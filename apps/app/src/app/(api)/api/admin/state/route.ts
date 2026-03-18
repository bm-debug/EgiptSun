import { getAdminState } from "@/shared/services/api/get-admin-state.service"

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  })

export const GET = getAdminState

export async function OPTIONS() {
  return onRequestOptions()
}

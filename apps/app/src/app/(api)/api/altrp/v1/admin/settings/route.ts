import { AuthenticatedRequestContext, withSuperAdminGuard } from '@/shared/api-guard'
import { SettingsRepository } from '@/shared/repositories/settings.repository'

const handleGet = async (context: AuthenticatedRequestContext) => {
  const { request } = context
  try {
    const repository = SettingsRepository.getInstance()
    const url = new URL(request.url)
    const attribute = url.searchParams.get('attribute')
    const uuid = url.searchParams.get('uuid')

    let settings

    if (uuid) {
      // Get setting by UUID
      settings = await repository.findByUuid(uuid)
    } else if (attribute) {
      // Get setting by attribute
      settings = await repository.findByAttribute(attribute)
    } else {
      // Get all settings
      settings = await repository.findAll()
    }

    return new Response(
      JSON.stringify({
        success: true,
        settings,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get settings error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch settings',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

const handlePut = async (context: AuthenticatedRequestContext) => {
  const { request } = context
  try {
    const repository = SettingsRepository.getInstance()
    const body = await request.json() as {
      uuid: string
      dataIn?: any
      value?: string
    }

    if (!body.uuid) {
      return new Response(
        JSON.stringify({ error: 'uuid is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if setting exists
    const existing = await repository.findByUuid(body.uuid)

    if (!existing) {
      return new Response(
        JSON.stringify({ error: 'Setting not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Update setting
    const updateData: any = {}

    if (body.dataIn !== undefined) {
      updateData.dataIn = body.dataIn
    }

    if (body.value !== undefined) {
      updateData.value = body.value
    }

    const updated = await repository.updateByUuid(body.uuid, updateData)

    return new Response(
      JSON.stringify({
        success: true,
        setting: updated,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Update setting error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to update setting',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const GET = withSuperAdminGuard(handleGet)
export const PUT = withSuperAdminGuard(handlePut)


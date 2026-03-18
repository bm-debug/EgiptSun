/// <reference types="@cloudflare/workers-types" />

import type { AuthenticatedRequestContext } from '@/shared/api-guard'
import { withManagerGuard } from '@/shared/api-guard'
import { ProductsRepository } from '@/shared/repositories/products.repository'

/**
 * GET /api/store/v2/m/products/:paid
 * Returns product details by paid
 */
async function handleGet(context: AuthenticatedRequestContext) {
  const { env, params } = context
  // Params are a Promise in Next.js 15, but api-guard might resolve them or we need to await them
  // The guard types defined `params` as `Record<string, string> | undefined` (resolved)
  // Let's check `api-guard.ts`. It resolves params.
  
  const paid = params?.paid

  try {
    if (!paid) {
      return new Response(
        JSON.stringify({ 
          error: 'Параметр paid обязателен' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const repository = ProductsRepository.getInstance()
    const product = await repository.findByPaid(paid)

    if (!product) {
      return new Response(
        JSON.stringify({ 
          error: 'Товар не найден' 
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    let dataIn = null
    dataIn = product.dataIn as Record<string, unknown> | null

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: product.id,
          uuid: product.uuid,
          paid: product.paid,
          title: product.title,
          category: product.category,
          type: product.type,
          statusName: product.statusName,
          isPublic: product.isPublic,
          dataIn,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get product details error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось загрузить данные товара',
        details: String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * PATCH /api/store/v2/m/products/:paid
 * Updates product by paid
 */
async function handlePatch(context: AuthenticatedRequestContext) {
  const { request, env, params } = context
  const paid = params?.paid

  try {
    if (!paid) {
      return new Response(
        JSON.stringify({ 
          error: 'Параметр paid обязателен' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const repository = ProductsRepository.getInstance()
    const existingProduct = await repository.findByPaid(paid)

    if (!existingProduct) {
      return new Response(
        JSON.stringify({ 
          error: 'Товар не найден' 
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const body = await request.json() as {
      title?: string
      category?: string
      statusName?: string
      data_in?: {
        warehouse_laid?: string
        price?: number
        reduced_limit?: number
      }
    }

    // Parse existing data_in
    let existingDataIn: Record<string, unknown> | null = null
    existingDataIn = existingProduct.dataIn as Record<string, unknown> | null

    // Merge data_in
    const updatedDataIn = {
      ...existingDataIn,
      ...(body.data_in || {}),
    }

    // Update product
    const updateData: any = {}
    
    if (body.title !== undefined) {
      updateData.title = body.title
    }
    
    if (body.category !== undefined) {
      updateData.category = body.category
    }
    
    if (body.statusName !== undefined) {
      updateData.statusName = body.statusName
    }
    
    if (body.data_in !== undefined) {
      updateData.dataIn = JSON.stringify(updatedDataIn)
    }

    // Update timestamp
    updateData.updatedAt = new Date().toISOString()

    const updated = await repository.update(paid, updateData)

    if (!updated) {
      return new Response(
        JSON.stringify({ 
          error: 'Не удалось обновить товар' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Товар успешно обновлен',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Update product error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось обновить товар',
        details: String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * DELETE /api/store/v2/m/products/:paid
 * Soft deletes product by paid
 */
async function handleDelete(context: AuthenticatedRequestContext) {
  const { env, params } = context
  const paid = params?.paid

  try {
    if (!paid) {
      return new Response(
        JSON.stringify({ 
          error: 'Параметр paid обязателен' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const repository = ProductsRepository.getInstance()
    const existingProduct = await repository.findByPaid(paid)

    if (!existingProduct) {
      return new Response(
        JSON.stringify({ 
          error: 'Товар не найден' 
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Soft delete
    const deleted = await repository.softDelete(paid)

    if (!deleted) {
      return new Response(
        JSON.stringify({ 
          error: 'Не удалось удалить товар' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Товар успешно удален',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Delete product error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Не удалось удалить товар',
        details: String(error) 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const GET = withManagerGuard(handleGet)
export const PATCH = withManagerGuard(handlePatch)
export const DELETE = withManagerGuard(handleDelete)

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}


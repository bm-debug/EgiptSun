import { DealsRepository } from '@/shared/repositories/deals.repository'
import type { DbFilters } from '@/shared/types/shared'
import { withClientGuard, AuthenticatedRequestContext } from '@/shared/api-guard'
import { processDataClientDeal } from '../route'
import { LoanApplication, GuarantorRelationDataIn } from '@/shared/types/altrp'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { RelationsRepository } from '@/shared/repositories/relations.repository'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'
import { createDb } from '@/shared/repositories/utils'
import { schema } from '@/shared/schema/schema'
import { inArray, isNull, and } from 'drizzle-orm'

/**
 * GET /api/c/deals/[id]
 * Returns deal details by ID
 */
export const onRequestGet = async (context: AuthenticatedRequestContext) => {
  const { request, env, params } = context
  const id = params?.id

  if (!id) {
    return new Response(JSON.stringify({ error: 'Deal ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { human } = context.user
    
    if (!human?.haid) {
      return new Response(JSON.stringify({ error: 'Human profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const dealsRepository = DealsRepository.getInstance()
    
    // Build filters for deal search
    const filters: DbFilters = {
      conditions: [
        {
          field: 'daid',
          operator: 'eq',
          values: [id],
        },
        {
          field: 'clientAid',
          operator: 'eq',
          values: [human.haid],
        },
        {
          field: 'dataIn',
          operator: 'like',
          values: ['%"type":"LOAN_APPLICATION"%'],
        },
      ],
    }
    
    // Get deal using repository
    const result = await dealsRepository.getDeals({
      filters,
      pagination: { page: 1, limit: 1 },
    })

    const deal = result.docs[0]

    if (!deal) {
      return new Response(JSON.stringify({ error: 'Deal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Load guarantors from relations
    const relationsRepository = RelationsRepository.getInstance()
    const guarantorRelations = await relationsRepository.findBySourceEntity(deal.daid || '', 'GUARANTOR')
    
    let guarantors: any[] = []
    if (guarantorRelations.length > 0) {
      const guarantorHaids = guarantorRelations.map((r) => r.targetEntity).filter(Boolean) as string[]
      
      if (guarantorHaids.length > 0) {
        const db = createDb()
        
        const guarantorHumans = await db
          .select()
          .from(schema.humans)
          .where(
            and(
              inArray(schema.humans.haid, guarantorHaids),
              isNull(schema.humans.deletedAt)
            )
          )
          .execute()
        
        guarantors = guarantorHumans.map((human) => {
          const dataIn = typeof human.dataIn === 'string' ? JSON.parse(human.dataIn) : human.dataIn || {}
          return {
            ...human,
            dataIn: {
              ...dataIn,
              phone: dataIn.phone || '',
            },
          }
        })
      }
    }

    return new Response(
      JSON.stringify({
        deal: {
          ...(await processDataClientDeal(deal as LoanApplication)),
          guarantors,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get deal error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get deal', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * PUT /api/c/deals/[id]
 * Update deal details by ID (allowed only while SCORING)
 */
export const onRequestPut = async (context: AuthenticatedRequestContext) => {
  const { params } = context
  const id = params?.id

  if (!id) {
    return new Response(JSON.stringify({ error: 'Deal ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { human } = context.user

    if (!human?.haid) {
      return new Response(JSON.stringify({ error: 'Human profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const dealsRepository = DealsRepository.getInstance()

    const filters: DbFilters = {
      conditions: [
        { field: 'daid', operator: 'eq', values: [id] },
        { field: 'clientAid', operator: 'eq', values: [human.haid] },
        { field: 'dataIn', operator: 'like', values: ['%"type":"LOAN_APPLICATION"%'] },
      ],
    }

    const result = await dealsRepository.getDeals({
      filters,
      pagination: { page: 1, limit: 1 },
    })

    const deal = result.docs[0] as LoanApplication | undefined

    if (!deal) {
      return new Response(JSON.stringify({ error: 'Deal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (deal.statusName !== 'SCORING') {
      return new Response(JSON.stringify({ error: 'Editing is allowed only for SCORING status' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const formData = await context.request.formData()
    const body: Record<string, any> = {}

    for (const [key, value] of formData.entries()) {
      if (key === 'documentPhotos') continue
      const fileValue = value as File | string
      if (fileValue instanceof File) continue
      body[key] = fileValue
    }

    const documentPhotos = formData
      .getAll('documentPhotos')
      .filter((item): item is File => item instanceof File)

    const requiredFields = ['firstName', 'lastName', 'phoneNumber', 'purchasePrice', 'installmentTerm']
    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(JSON.stringify({ error: `Отсутствует обязательное поле: ${field}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const russianPattern = /^[А-Яа-яЁё\s-]+$/
    if (body.firstName && !russianPattern.test(String(body.firstName).trim())) {
      return new Response(JSON.stringify({ error: 'Имя должно содержать только русские буквы, пробелы и дефисы' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (body.lastName && !russianPattern.test(String(body.lastName).trim())) {
      return new Response(JSON.stringify({ error: 'Фамилия должна содержать только русские буквы, пробелы и дефисы' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (body.middleName && !russianPattern.test(String(body.middleName).trim())) {
      return new Response(JSON.stringify({ error: 'Отчество должно содержать только русские буквы, пробелы и дефисы' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const installmentTerm = parseInt(body.installmentTerm || '0', 10)
    if (isNaN(installmentTerm) || installmentTerm <= 0) {
      return new Response(JSON.stringify({ error: 'Неверный срок рассрочки' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const humanRepository = HumanRepository.getInstance()

    const fullName = [body.lastName, body.firstName, body.middleName].filter(Boolean).join(' ').trim() || human.fullName
    const currentHumanDataIn =
      typeof human.dataIn === 'string'
        ? (JSON.parse(human.dataIn) as Record<string, unknown>)
        : (human.dataIn as Record<string, unknown>) || {}

    const updatedHumanDataIn: Record<string, unknown> = {
      ...currentHumanDataIn,
      phone: body.phoneNumber || currentHumanDataIn.phone,
      ...(body.firstName && { firstName: body.firstName }),
      ...(body.lastName && { lastName: body.lastName }),
      ...(body.middleName && { middleName: body.middleName }),
      ...(body.dateOfBirth && { dateOfBirth: body.dateOfBirth }),
      ...(body.placeOfBirth && { placeOfBirth: body.placeOfBirth }),
      ...(body.citizenship && { citizenship: body.citizenship }),
      ...(body.maritalStatus && { maritalStatus: body.maritalStatus }),
      ...(body.numberOfChildren && { numberOfChildren: body.numberOfChildren }),
      ...(body.passportSeries && { passportSeries: body.passportSeries }),
      ...(body.passportNumber && { passportNumber: body.passportNumber }),
      ...(body.passportIssueDate && { passportIssueDate: body.passportIssueDate }),
      ...(body.passportIssuedBy && { passportIssuedBy: body.passportIssuedBy }),
      ...(body.passportDivisionCode && { passportDivisionCode: body.passportDivisionCode }),
      ...(body.inn && { inn: body.inn }),
      ...(body.snils && { snils: body.snils }),
      ...(body.permanentAddress && { permanentAddress: body.permanentAddress }),
      ...(body.registrationAddress && { registrationAddress: body.registrationAddress }),
      ...(body.employmentInfo_sb && { employmentInfo_sb: String(body.employmentInfo_sb).trim() }),
      ...(body.officialIncome_sb && { officialIncome_sb: String(body.officialIncome_sb).trim() }),
      ...(body.additionalIncome_sb && { additionalIncome_sb: String(body.additionalIncome_sb).trim() }),
      ...(body.monthlyIncome && { monthlyIncome: String(body.monthlyIncome).trim() }),
      ...(body.monthlyExpenses && { monthlyExpenses: String(body.monthlyExpenses).trim() }),
      ...(body.workPlace && { workPlace: String(body.workPlace).trim() }),
      ...(body.workExperience && { workExperience: String(body.workExperience).trim() }),
    }

    await humanRepository.update(human.uuid, {
      fullName,
      birthday: body.dateOfBirth || human.birthday,
      dataIn: updatedHumanDataIn,
    })

    const applicantName = `${String(body.firstName).trim()} ${String(body.lastName).trim()}`.trim()
    let dealTitle = deal.title || 'Заявка на кредит'
    if (body.productName) {
      dealTitle = String(body.productName).trim()
      if (applicantName) dealTitle += ` - ${applicantName}`
    } else if (applicantName) {
      dealTitle = `Заявка на кредит - ${applicantName}`
    }

    const updated = await dealsRepository.updateLoanApplicationDealByClientWhileScoring(deal.uuid, {
      type: 'LOAN_APPLICATION',
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      middleName: body.middleName ? String(body.middleName) : undefined,
      phone: String(body.phoneNumber),
      email: String(human.email || '').trim().toLowerCase(),
      productPrice: String(body.purchasePrice),
      term: [installmentTerm],
      productName: body.productName,
      purchaseLocation: body.purchaseLocation,
      downPayment: body.downPayment,
      comfortableMonthlyPayment: body.comfortableMonthlyPayment,
      monthlyPayment: body.monthlyPayment,
      partnerLocation: body.partnerLocation,
      convenientPaymentDate: body.convenientPaymentDate,
      ...(body.officialIncome_sb && { officialIncome_sb: String(body.officialIncome_sb) }),
      ...(body.additionalIncome_sb && { additionalIncome_sb: String(body.additionalIncome_sb) }),
      ...(body.employmentInfo_sb && { employmentInfo_sb: String(body.employmentInfo_sb) }),
      ...(body.monthlyIncome && { monthlyIncome: String(body.monthlyIncome) }),
      ...(body.monthlyExpenses && { monthlyExpenses: String(body.monthlyExpenses) }),
      ...(body.workPlace && { workPlace: String(body.workPlace) }),
      ...(body.workExperience && { workExperience: String(body.workExperience) }),
    }, dealTitle)

    if (documentPhotos.length > 0) {
      const fileStorageService = FileStorageService.getInstance()
      const uploadedFiles: string[] = []

      for (const file of documentPhotos) {
        try {
          const media = await fileStorageService.uploadFile(file, updated.updatedDeal.uuid, file.name, human.haid)
          uploadedFiles.push(media.uuid)
        } catch (error) {
          console.error('Ошибка при загрузке файла:', error)
        }
      }

      if (uploadedFiles.length > 0) {
        await dealsRepository.attachDocumentsToDeal(updated.updatedDeal.uuid, uploadedFiles)
      }
    }

    // Handle guarantors
    const relationsRepository = RelationsRepository.getInstance()
    const dealAid = updated.updatedDeal.daid

    if (dealAid) {
      // Get selected guarantors from form
      const selectedGuarantors = body.selectedGuarantors
        ? (typeof body.selectedGuarantors === 'string'
            ? JSON.parse(body.selectedGuarantors)
            : Array.isArray(body.selectedGuarantors)
              ? body.selectedGuarantors
              : [])
        : []
      // Ensure string haids
      const normalizedSelected = selectedGuarantors
        .filter(Boolean)
        .map((id: any) => String(id))

      // Collect all guarantor haids (only selected)
      const guarantorHaids: string[] = [...normalizedSelected]
      const relationUpdates: Array<{ haid: string; dataIn: GuarantorRelationDataIn }> = []

      // Parse newGuarantors for relation data updates (only for existing haids)
      if (body.newGuarantors) {
        try {
          const parsed = typeof body.newGuarantors === 'string' ? JSON.parse(body.newGuarantors) : body.newGuarantors
          if (Array.isArray(parsed)) {
            for (const g of parsed) {
              const haid = g.haid ? String(g.haid).trim() : ''
              if (!haid) continue
              if (!guarantorHaids.includes(haid)) {
                guarantorHaids.push(haid)
              }
              const fullName = g.fullName ? String(g.fullName).trim() : ''
              const phone = g.phone ? String(g.phone).trim() : ''
              const relationship = g.relationship ? String(g.relationship).trim() : undefined
              const income = g.income ? String(g.income).trim() : undefined
              relationUpdates.push({
                haid,
                dataIn: {
                  guarantorFullName: fullName || undefined,
                  guarantorPhone: phone || undefined,
                  guarantorRelationship: relationship,
                  guarantorIncome: income,
                },
              })
            }
          }
        } catch (e) {
          console.error('Failed to parse newGuarantors for relation updates:', e)
        }
      }

      // Replace all guarantor relations for this deal
      if (guarantorHaids.length > 0) {
        await relationsRepository.replaceRelations(dealAid, guarantorHaids, 'GUARANTOR', 0)

        // Update dataIn for guarantor relations when provided
        for (const { haid, dataIn: relationDataIn } of relationUpdates) {
          const relation = await relationsRepository.findBySourceAndTarget(dealAid, haid, 'GUARANTOR')
          
          if (relation && relation.uuid) {
            await relationsRepository.update(relation.uuid, {
              dataIn: relationDataIn,
            })
          }
        }
      } else {
        // Remove all guarantor relations if no guarantors selected
        await relationsRepository.deleteBySourceEntity(dealAid, 'GUARANTOR')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Заявка обновлена',
        deal: await processDataClientDeal(updated.updatedDeal as LoanApplication),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Update deal error:', error)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    return new Response(JSON.stringify({ error: 'Failed to update deal', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })

export const GET = withClientGuard(onRequestGet)  
export const PUT = withClientGuard(onRequestPut)

export async function OPTIONS() {
  return onRequestOptions()
}


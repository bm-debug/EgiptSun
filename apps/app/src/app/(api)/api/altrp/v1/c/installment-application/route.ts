import { getSession } from '@/shared/session'
import { Env } from '@/shared/types'
import { MeRepository } from '@/shared/repositories/me.repository'
import { DealsRepository } from '@/shared/repositories/deals.repository'
import { HumanRepository } from '@/shared/repositories/human.repository'
import { LoanApplicationDataIn } from '@/shared/types/altrp'
import { withClientGuard } from '@/shared/api-guard'
import { FileStorageService } from '@/shared/services/storage/file-storage.service'

/**
 * POST /api/c/installment-application
 * Submit installment application
 */
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context

  if (!env.AUTH_SECRET) {
    return new Response(JSON.stringify({ error: 'Аутентификация не настроена' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sessionUser = await getSession(request, env.AUTH_SECRET)

  if (!sessionUser) {
    return new Response(JSON.stringify({ error: 'Не авторизован' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Parse FormData
    const formData = await request.formData()
    const body: Record<string, any> = {}
    
    // Extract text fields from FormData
    for (const [key, value] of formData.entries()) {
      if (key === 'documentPhotos') {
        // Skip files, handle separately
        continue
      }
      const fileValue = value as File | string
      if (fileValue instanceof File) {
        // Skip file fields, handle separately
        continue
      }
      body[key] = fileValue
    }

    // Extract files
    const documentPhotos = formData.getAll('documentPhotos').filter((item): item is File => item instanceof File)
    
    // Check if user is client (consumer)
    const meRepository = MeRepository.getInstance()
    const userWithRolesForCheck = await meRepository.findByIdWithRoles(Number(sessionUser.id))
    const isClient = userWithRolesForCheck?.roles?.some((role) => {
      if (!role.name) return false
      const normalized = role.name.toLowerCase()
      return (normalized === 'consumer' || normalized === 'потребитель' || normalized === 'client') &&
        !userWithRolesForCheck.roles.some((r) => r.name === 'Administrator' || r.name === 'admin')
    }) || false

    // documentPhotos is now optional for clients - can be requested later via ADDITIONAL_INFO_REQUESTED
    
    // Validate required fields (simplified - only core fields)
    const requiredFields = [
      'firstName',
      'lastName',
      'phoneNumber',
      'purchasePrice',
      'installmentTerm',
    ]
    // downPayment and permanentAddress are now optional

    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ error: `Отсутствует обязательное поле: ${field}` }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Валидация русских букв в имени, фамилии и отчестве
    const russianPattern = /^[А-Яа-яЁё\s-]+$/
    
    if (body.firstName && !russianPattern.test(String(body.firstName).trim())) {
      return new Response(
        JSON.stringify({ error: 'Имя должно содержать только русские буквы, пробелы и дефисы' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (body.lastName && !russianPattern.test(String(body.lastName).trim())) {
      return new Response(
        JSON.stringify({ error: 'Фамилия должна содержать только русские буквы, пробелы и дефисы' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (body.middleName && !russianPattern.test(String(body.middleName).trim())) {
      return new Response(
        JSON.stringify({ error: 'Отчество должно содержать только русские буквы, пробелы и дефисы' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const userWithRoles = await meRepository.findByIdWithRoles(Number(sessionUser.id))

    if (!userWithRoles || !userWithRoles.human) {
      return new Response(JSON.stringify({ error: 'Пользователь не найден' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const humanRepository = HumanRepository.getInstance()
    const dealsRepository = DealsRepository.getInstance()

    // Get current user's human
    const currentHuman = userWithRoles.human

    // Prepare data for Human update (Личные данные, Паспортные данные, Документы, Адреса)
    const fullName = [
      body.lastName,
      body.firstName,
      body.middleName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || currentHuman.fullName

    // Get current dataIn and merge with new data
    const currentDataIn = typeof currentHuman.dataIn === 'string'
      ? (JSON.parse(currentHuman.dataIn) as Record<string, unknown>)
      : (currentHuman.dataIn as Record<string, unknown>) || {}

    const updatedDataIn: Record<string, unknown> = {
      ...currentDataIn,
      phone: body.phoneNumber || currentDataIn.phone,
      // Личные данные
      ...(body.firstName && { firstName: body.firstName }),
      ...(body.lastName && { lastName: body.lastName }),
      ...(body.middleName && { middleName: body.middleName }),
      ...(body.dateOfBirth && { dateOfBirth: body.dateOfBirth }),
      ...(body.placeOfBirth && { placeOfBirth: body.placeOfBirth }),
      ...(body.citizenship && { citizenship: body.citizenship }),
      ...(body.maritalStatus && { maritalStatus: body.maritalStatus }),
      ...(body.numberOfChildren && { numberOfChildren: body.numberOfChildren }),
      // Паспортные данные
      ...(body.passportSeries && { passportSeries: body.passportSeries }),
      ...(body.passportNumber && { passportNumber: body.passportNumber }),
      ...(body.passportIssueDate && { passportIssueDate: body.passportIssueDate }),
      ...(body.passportIssuedBy && { passportIssuedBy: body.passportIssuedBy }),
      ...(body.passportDivisionCode && { passportDivisionCode: body.passportDivisionCode }),
      ...(body.inn && { inn: body.inn }),
      ...(body.snils && { snils: body.snils }),
      // Адреса
      ...(body.permanentAddress && { permanentAddress: body.permanentAddress }),
      ...(body.registrationAddress && { registrationAddress: body.registrationAddress }),
      // Финансовая информация (сохраняем в human, чтобы подставлять при следующих заявках)
      ...(body.employmentInfo_sb && { employmentInfo_sb: body.employmentInfo_sb.trim() }),
      ...(body.officialIncome_sb && { officialIncome_sb: body.officialIncome_sb.trim() }),
      ...(body.additionalIncome_sb && { additionalIncome_sb: body.additionalIncome_sb.trim() }),
      ...(body.monthlyIncome && { monthlyIncome: body.monthlyIncome.trim() }),
      ...(body.monthlyExpenses && { monthlyExpenses: body.monthlyExpenses.trim() }),
      ...(body.workPlace && { workPlace: body.workPlace.trim() }),
      ...(body.workExperience && { workExperience: body.workExperience.trim() }),
    }

    // Update Human with personal data
    const humanUpdateData: Partial<any> = {
      fullName: fullName || currentHuman.fullName,
      birthday: body.dateOfBirth || currentHuman.birthday,
      dataIn: updatedDataIn,
    }

    // Update existing human
    const updatedHuman = await humanRepository.update(currentHuman.uuid, humanUpdateData) as any

    // Prepare data for Deal creation
    const installmentTerm = parseInt(body.installmentTerm || '0', 10)
    if (isNaN(installmentTerm) || installmentTerm <= 0) {
      return new Response(
        JSON.stringify({ error: 'Неверный срок рассрочки' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare loan application data with all form fields
    const loanApplicationData: LoanApplicationDataIn = {
      type: 'LOAN_APPLICATION',
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      phone: body.phoneNumber.trim(),
      email: (userWithRoles.human.email || '').trim().toLowerCase(),
      productPrice: body.purchasePrice.trim(),
      term: [installmentTerm],
      // Include all additional form data
      middleName: body.middleName,
      productName: body.productName,
      purchaseLocation: body.purchaseLocation,
      downPayment: body.downPayment,
      comfortableMonthlyPayment: body.comfortableMonthlyPayment,
      monthlyPayment: body.monthlyPayment,
      partnerLocation: body.partnerLocation,
      convenientPaymentDate: body.convenientPaymentDate,
      // Financial information (Security Review - СБ)
      ...(body.officialIncome_sb && { officialIncome_sb: body.officialIncome_sb.trim() }),
      ...(body.additionalIncome_sb && { additionalIncome_sb: body.additionalIncome_sb.trim() }),
      ...(body.employmentInfo_sb && { employmentInfo_sb: body.employmentInfo_sb.trim() }),
      ...(body.monthlyIncome && { monthlyIncome: body.monthlyIncome.trim() }),
      ...(body.monthlyExpenses && { monthlyExpenses: body.monthlyExpenses.trim() }),
      ...(body.workPlace && { workPlace: body.workPlace.trim() }),
      ...(body.workExperience && { workExperience: body.workExperience.trim() }),
    }

    // Create deal using existing repository method
    const result = await dealsRepository.createLoanApplicationDealPublic(loanApplicationData)

    // Update deal's clientAid to use current user's human if different
    if (updatedHuman.haid !== result.createdDeal.clientAid) {
      await dealsRepository.update(result.createdDeal.uuid, {
        clientAid: updatedHuman.haid,
      })
    }

    // Upload and attach documents if provided
    if (documentPhotos.length > 0) {
      const fileStorageService = FileStorageService.getInstance()
      const uploadedFiles: string[] = []

      for (const file of documentPhotos) {
        try {
          const media = await fileStorageService.uploadFile(
            file,
            result.createdDeal.uuid,
            file.name,
            updatedHuman.haid
          )
          uploadedFiles.push(media.uuid)
        } catch (error) {
          console.error('Ошибка при загрузке файла:', error)
          // Continue with other files even if one fails
        }
      }

      // Attach documents to deal
      if (uploadedFiles.length > 0) {
        await dealsRepository.attachDocumentsToDeal(result.createdDeal.uuid, uploadedFiles)
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Заявка на рассрочку успешно подана',
        dealId: result.createdDeal.daid,
        dealUuid: result.createdDeal.uuid,
        status: result.createdDeal.statusName,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Ошибка при подаче заявки:', error)
    const errorMessage = error instanceof Error ? error.message : 'Не удалось подать заявку'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const onRequestOptions = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  })

export const POST = withClientGuard(onRequestPost)  

export async function OPTIONS() {
  return onRequestOptions()
}



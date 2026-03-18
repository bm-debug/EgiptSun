'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useMe } from '@/providers/MeProvider'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { altrpHuman } from '@/shared/types/altrp'
import { Progress } from '@/components/ui/progress'
import dynamic from 'next/dynamic'
import type { Value as E164Number } from 'react-phone-number-input'

const PhoneInput = dynamic(
  () => import('@/components/ui/phone-input').then((mod) => mod.PhoneInput),
  { ssr: false }
)

const normalizePhoneToE164 = (raw?: string | null): string | undefined => {
  if (!raw) return undefined
  const digits = raw.replace(/\D/g, '')
  if (!digits) return undefined
  let normalized = digits
  if (normalized.length === 11 && normalized.startsWith('8')) {
    normalized = `7${normalized.slice(1)}`
  }
  if (normalized.length === 10 && normalized.startsWith('9')) {
    normalized = `7${normalized}`
  }
  if (!normalized.startsWith('+')) {
    normalized = `+${normalized}`
  }
  return normalized
}

interface FormData {
  // Client Primary Info
  firstName: string
  lastName: string
  middleName: string
  phoneNumber: string
  email: string
  dateOfBirth: string
  placeOfBirth: string
  citizenship: string
  passportSeries: string
  passportNumber: string
  passportIssueDate: string
  passportIssuedBy: string
  passportDivisionCode: string
  inn: string
  snils: string
  maritalStatus: string
  numberOfChildren: string
  productName: string
  productPrice: string
  purchaseLocation: string
  permanentAddress: string
  registrationAddress: string

  // Product and Terms
  documentPhotos: File[]
  comfortableMonthlyPayment: string
  purchasePrice: string
  downPayment: string
  installmentTerm: string
  monthlyPayment: string
  markupAmount: string
  partnerLocation: string
  convenientPaymentDate: string

  // Security Review (СБ)
  fsspInfo_sb: string
  getcontactInfo_sb: string
  purchasePurpose_sb: string
  referralSource_sb: string
  employmentInfo_sb: string
  additionalIncome_sb: string
  officialIncome_sb: string
  monthlyIncome: string
  monthlyExpenses: string
  workPlace: string
  workExperience: string
  maritalStatus_sb: string
  childrenInfo_sb: string
  creditHistory_sb: string
  collateralInfo_sb: string
  housingInfo_sb: string
  additionalContact_sb: string
  relativesContactPermission_sb: string
  localFeedback_sb: string
  psychologicalAssessment_sb: string

  // Guarantor 1 (П1)
  responsibleAgent_p1: string
  fsspInfo_p1: string
  getcontactInfo_p1: string
  relationship_p1: string
  fullName_p1: string
  passportPhoto_p1: File[]
  phoneNumber_p1: string
  address_p1: string
  employmentIncome_p1: string
  maritalStatus_p1: string
  childrenInfo_p1: string
  additionalIncome_p1: string
  creditHistory_p1: string
  collateralInfo_p1: string
  housingInfo_p1: string
  isNewClient_p1: string
  psychologicalAssessment_p1: string
  additionalPhoneNumber_p1: string

  // Guarantor 2 (П2)
  fsspInfo_p2: string
  getcontactInfo_p2: string
  fullName_p2: string
  passportPhoto_p2: File[]
  phoneNumber_p2: string
  relationship_p2: string
  address_p2: string
  employmentIncome_p2: string
  maritalStatus_p2: string
  childrenInfo_p2: string
  creditHistory_p2: string
  additionalIncome_p2: string
  relativesContact_p2: string
  isNewClient_p2: string
  psychologicalAssessment_p2: string
  additionalPhoneNumber_p2: string

  // Final Docs
  contractDocuments: File[]

  // Consent
  consentToProcessData: boolean

  // Guarantor (client form)
  guarantorFullName?: string
  guarantorPhone?: string
  guarantorRelationship?: string
  guarantorIncome?: string
  selectedGuarantors?: string[] // Array of guarantor haids
}

interface NewGuarantor {
  id: string // Temporary ID for list management
  haid?: string
  fullName: string
  phone: string
  relationship?: string
  income?: string
}

// Steps for client form (6 steps)
// Simplified CLIENT_STEPS - only 3 steps for better UX
const CLIENT_STEPS = [
  {
    id: 'contacts',
    title: 'Контакты',
    description: 'Введите ваши контактные данные',
  },
  {
    id: 'productInfo',
    title: 'Покупка',
    description: 'Информация о товаре и условиях рассрочки',
  },
  {
    id: 'guarantor',
    title: 'Поручитель',
    description: 'Укажите данные поручителя (необязательно)',
  },
  {
    id: 'consent',
    title: 'Согласие',
    description: 'Подтвердите согласие на обработку данных',
  },
] as const

// All sections available in the form (for admin/staff)
const ALL_SECTIONS = [
  {
    id: 'clientPrimaryInfo',
    title: 'Основная информация (заполняет клиент)',
    description: 'Введите ваши основные данные',
  },
  {
    id: 'productAndTerms',
    title: 'Товар и условия рассрочки',
    description: 'Информация о товаре и условиях рассрочки',
  },
  {
    id: 'securityReview',
    title: 'Рассмотрение (СБ)',
    description: 'Информация для службы безопасности',
    internalOnly: true, // Only for internal staff
  },
  {
    id: 'guarantor1',
    title: 'Поручитель 1 (П1)',
    description: 'Информация о первом поручителе',
    internalOnly: true, // Only for internal staff
  },
  {
    id: 'guarantor2',
    title: 'Поручитель 2 (П2)',
    description: 'Информация о втором поручителе',
    internalOnly: true, // Only for internal staff
  },
  {
    id: 'finalDocs',
    title: 'ДКП и другие документы',
    description: 'Загрузите необходимые документы',
    internalOnly: true, // Only for internal staff
  },
  {
    id: 'consent',
    title: 'Согласие',
    description: 'Подтвердите согласие на обработку данных',
  },
] as const

// Helper function to get correct month word form
function getMonthWord(months: number): string {
  const lastDigit = months % 10
  const lastTwoDigits = months % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'месяцев'
  }
  
  if (lastDigit === 1) {
    return 'месяц'
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return 'месяца'
  } else {
    return 'месяцев'
  }
}

export function InstallmentApplicationForm({
  human,
  initialValues,
  submitUrl = '/api/altrp/v1/c/installment-application',
  submitMethod = 'POST',
  successRedirectUrl = '/c/deals',
}: {
  human?: altrpHuman
  initialValues?: Partial<FormData>
  submitUrl?: string
  submitMethod?: 'POST' | 'PUT' | 'PATCH'
  successRedirectUrl?: string
}) {
  const router = useRouter()
  const { user: meUser, loading: meLoading } = useMe()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [currentSection, setCurrentSection] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [stepErrors, setStepErrors] = React.useState<Record<number, string[]>>({})
  const [submitAttempted, setSubmitAttempted] = React.useState(false)
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    clientPrimaryInfo: true, // Первая секция открыта по умолчанию
    productAndTerms: true, // Секция товара и условий всегда открыта
    consent: true, // Секция согласия всегда открыта
  })

  const [formData, setFormData] = React.useState<Partial<FormData>>({
    consentToProcessData: false,
    guarantorFullName: '',
    guarantorPhone: '',
    guarantorRelationship: '',
    guarantorIncome: '',
    selectedGuarantors: [],
    // Default installment term to 6 months so backend always получает значение
    installmentTerm: '6',
  })

  const [existingGuarantors, setExistingGuarantors] = React.useState<Array<{ haid: string; fullName: string; phone?: string }>>([])
  const [loadingGuarantors, setLoadingGuarantors] = React.useState(false)
  const [newGuarantors, setNewGuarantors] = React.useState<NewGuarantor[]>([])
  const [addingGuarantor, setAddingGuarantor] = React.useState(false)

  const didApplyInitialValuesRef = React.useRef(false)
  React.useEffect(() => {
    if (!initialValues) return
    if (didApplyInitialValuesRef.current) return

    setFormData((prev) => ({
      ...prev,
      ...initialValues,
      phoneNumber: normalizePhoneToE164(initialValues.phoneNumber) || initialValues.phoneNumber,
    }))

    didApplyInitialValuesRef.current = true
  }, [initialValues])

  // Load existing guarantors when form is mounted (only for edit mode)
  React.useEffect(() => {
    if (submitMethod === 'PUT' || submitMethod === 'PATCH') {
      setLoadingGuarantors(true)
      fetch('/api/altrp/v1/c/guarantors', { credentials: 'include' })
        .then((res) => res.json())
        .then((data: unknown) => {
          const response = data as { success?: boolean; guarantors?: Array<{ haid: string; fullName?: string; dataIn?: { phone?: string } }> }
          if (response.success && response.guarantors) {
            setExistingGuarantors(
              response.guarantors.map((g) => ({
                haid: g.haid,
                fullName: g.fullName || '',
                phone: g.dataIn?.phone || '',
              }))
            )
          }
        })
        .catch((err) => {
          console.error('Failed to load guarantors:', err)
        })
        .finally(() => {
          setLoadingGuarantors(false)
        })
    }
  }, [submitMethod])

  const toggleSection = (sectionId: string) => {
    // Don't allow closing consent and productAndTerms sections
    if (sectionId === 'consent' || sectionId === 'productAndTerms') {
      return
    }
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  // Check if user is a client (consumer)
  const isClient = React.useMemo(() => {
    if (!meUser || meLoading) return true // Default to client if not loaded
    
    const hasConsumerRole = meUser.roles.some((role) => {
      if (!role.name) return false
      const normalized = role.name.toLowerCase()
      return normalized === 'consumer' || normalized === 'потребитель' || normalized === 'client'
    })
    
    const isAdmin = meUser.roles.some((role) => 
      role.name === 'Administrator' || role.name === 'admin'
    )
    
    // If user has only consumer role and no admin role, they are a client
    return hasConsumerRole && !isAdmin
  }, [meUser, meLoading])

  // Filter sections based on user role
  const sections = React.useMemo(() => {
    if (isClient) {
      // For clients, use 6-step structure
      return CLIENT_STEPS
    }
    // For admin/staff, show all sections
    return ALL_SECTIONS
  }, [isClient])

  // Reset currentSection if it's out of bounds after filtering
  React.useEffect(() => {
    if (currentSection >= sections.length) {
      setCurrentSection(Math.max(0, sections.length - 1))
    }
  }, [sections.length, currentSection])

  // Reset currentStep if it's out of bounds after filtering
  React.useEffect(() => {
    if (currentStep >= sections.length) {
      setCurrentStep(Math.max(0, sections.length - 1))
    }
  }, [sections.length, currentStep])

  // Validate step based on step index
  const validateStep = React.useCallback((stepIndex: number): string[] => {
    const errors: string[] = []
    const section = sections[stepIndex]
    
    if (!section) return errors

    // Client steps validation (simplified - only core fields required)
    if (isClient) {
      switch (section.id) {
        case 'contacts': {
          // Only core contact fields required
          if (!formData.lastName?.trim()) errors.push('Фамилия обязательна для заполнения')
          if (!formData.firstName?.trim()) errors.push('Имя обязательно для заполнения')
          if (!formData.phoneNumber?.trim()) errors.push('Телефон обязателен для заполнения')
          
          // Validate Russian text
          if (formData.lastName && !/^[А-Яа-яЁё\s-]+$/.test(formData.lastName)) {
            errors.push('Фамилия должна содержать только русские буквы')
          }
          if (formData.firstName && !/^[А-Яа-яЁё\s-]+$/.test(formData.firstName)) {
            errors.push('Имя должно содержать только русские буквы')
          }
          if (formData.middleName && !/^[А-Яа-яЁё\s-]+$/.test(formData.middleName)) {
            errors.push('Отчество должно содержать только русские буквы')
          }
          break
        }
        case 'productInfo': {
          // Only core product fields required
          if (!formData.purchasePrice?.trim()) errors.push('Стоимость покупки обязательна для заполнения')
          if (!formData.installmentTerm?.trim()) errors.push('Срок рассрочки обязателен для заполнения')
          // documentPhotos is now optional - can be requested later
          break
        }
        case 'guarantor': {
          // Optional step — no required fields
          break
        }
        case 'consent': {
          if (!formData.consentToProcessData) {
            errors.push('Необходимо дать согласие на обработку персональных данных')
          }
          break
        }
      }
      return errors
    }

    // Admin/staff validation (old logic)
    switch (section.id) {
      case 'clientPrimaryInfo': {
        if (!formData.lastName?.trim()) errors.push('Фамилия обязательна для заполнения')
        if (!formData.firstName?.trim()) errors.push('Имя обязательно для заполнения')
        if (!formData.dateOfBirth) errors.push('Дата рождения обязательна для заполнения')
        if (!formData.placeOfBirth?.trim()) errors.push('Место рождения обязательно для заполнения')
        if (!formData.phoneNumber?.trim()) errors.push('Телефон обязателен для заполнения')
        if (!formData.citizenship?.trim()) errors.push('Гражданство обязательно для заполнения')
        if (!formData.passportSeries?.trim()) errors.push('Серия паспорта обязательна для заполнения')
        if (!formData.passportNumber?.trim()) errors.push('Номер паспорта обязателен для заполнения')
        if (!formData.passportIssueDate) errors.push('Дата выдачи паспорта обязательна для заполнения')
        if (!formData.passportIssuedBy?.trim()) errors.push('Кем выдан паспорт обязательно для заполнения')
        if (!formData.passportDivisionCode?.trim()) errors.push('Код подразделения обязателен для заполнения')
        
        // Validate Russian text
        if (formData.lastName && !/^[А-Яа-яЁё\s-]+$/.test(formData.lastName)) {
          errors.push('Фамилия должна содержать только русские буквы')
        }
        if (formData.firstName && !/^[А-Яа-яЁё\s-]+$/.test(formData.firstName)) {
          errors.push('Имя должно содержать только русские буквы')
        }
        if (formData.middleName && !/^[А-Яа-яЁё\s-]+$/.test(formData.middleName)) {
          errors.push('Отчество должно содержать только русские буквы')
        }
        break
      }
      case 'productAndTerms': {
        if (!formData.productName?.trim()) errors.push('Название товара обязательно для заполнения')
        if (!formData.purchasePrice?.trim()) errors.push('Стоимость покупки обязательна для заполнения')
        if (!formData.installmentTerm?.trim()) errors.push('Срок рассрочки обязателен для заполнения')
        break
      }
      case 'consent': {
        if (!formData.consentToProcessData) {
          errors.push('Необходимо дать согласие на обработку персональных данных')
        }
        break
      }
      case 'securityReview': {
        if (!formData.fsspInfo_sb?.trim()) errors.push('Информация из ФССП обязательна для заполнения')
        if (!formData.getcontactInfo_sb?.trim()) errors.push('Информация из Гетконтакт обязательна для заполнения')
        if (!formData.employmentInfo_sb?.trim()) errors.push('Место работы обязательно для заполнения')
        if (!formData.officialIncome_sb?.trim()) errors.push('Официальное трудоустройство обязательно для заполнения')
        if (!formData.maritalStatus_sb?.trim()) errors.push('Семейное положение обязательно для заполнения')
        if (!formData.creditHistory_sb?.trim()) errors.push('Кредитная история обязательна для заполнения')
        if (!formData.additionalContact_sb?.trim()) errors.push('Дополнительный номер обязателен для заполнения')
        break
      }
      // Add validation for other steps if needed
    }
    
    return errors
  }, [formData, sections, isClient])

  // Calculate progress percentage
  const calculateProgress = React.useCallback((): number => {
    const totalSteps = sections.length
    if (!totalSteps) return 0
    
    // Count completed previous steps (without errors)
    let completedPreviousSteps = 0
    for (let i = 0; i < currentStep; i++) {
      const errors = validateStep(i)
      if (errors.length === 0) {
        completedPreviousSteps++
      }
    }
    
    // Check if current step is completed
    const currentStepErrors = validateStep(currentStep)
    const isCurrentStepCompleted = currentStepErrors.length === 0
    
    // Progress = (completed previous steps + (current step completed ? 1 : 0.5)) / total steps * 100
    const progressValue = (completedPreviousSteps + (isCurrentStepCompleted ? 1 : 0.5)) / totalSteps * 100
    
    return Math.round(progressValue)
  }, [sections, currentStep, validateStep])

  const progress = React.useMemo(() => calculateProgress(), [calculateProgress])

  // Navigation functions
  const nextStep = React.useCallback(() => {
    const errors = validateStep(currentStep)
    if (errors.length > 0) {
      setStepErrors((prev) => ({ ...prev, [currentStep]: errors }))
      return
    }
    
    setStepErrors((prev) => {
      const updated = { ...prev }
      delete updated[currentStep]
      return updated
    })
    
    if (currentStep < sections.length - 1) {
      setCurrentStep(currentStep + 1)
      // Scroll to next step
      setTimeout(() => {
        const nextElement = document.getElementById(`step-${currentStep + 1}`)
        nextElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [currentStep, sections.length, validateStep])

  const prevStep = React.useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      // Scroll to previous step
      setTimeout(() => {
        const prevElement = document.getElementById(`step-${currentStep - 1}`)
        prevElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [currentStep])

  const goToStep = React.useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < sections.length) {
      setCurrentStep(stepIndex)
      setTimeout(() => {
        const stepElement = document.getElementById(`step-${stepIndex}`)
        stepElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [sections.length])

  // Format division code: XXX-XXX (6 digits with hyphen)
  const formatDivisionCode = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    // Limit to 6 digits
    const limited = digits.slice(0, 6)
    // Add hyphen after 3rd digit if we have more than 3 digits
    if (limited.length <= 3) {
      return limited
    }
    return `${limited.slice(0, 3)}-${limited.slice(3)}`
  }

  // Format SNILS: XXX-XXX-XXX XX (11 digits with hyphens and space)
  const formatSnils = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    // Limit to 11 digits
    const limited = digits.slice(0, 11)
    
    if (limited.length <= 3) {
      return limited
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`
    } else if (limited.length <= 9) {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6, 9)} ${limited.slice(9)}`
    }
  }

  // Format income: format number with spaces every 3 digits (e.g., 11 000 000)
  const formatIncome = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    if (!digits) return ''
    // Format with spaces every 3 digits from right to left
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    // Apply mask for division code
    if (field === 'passportDivisionCode' && typeof value === 'string') {
      value = formatDivisionCode(value)
    }
    // Apply mask for SNILS
    if (field === 'snils' && typeof value === 'string') {
      value = formatSnils(value)
    }
    // Apply mask for guarantor income
    if (field === 'guarantorIncome' && typeof value === 'string') {
      value = formatIncome(value)
    }
    // Don't normalize guarantorPhone - PhoneInput returns E164 format directly
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear step errors when user starts typing
    if (stepErrors[currentStep] && stepErrors[currentStep].length > 0) {
      setStepErrors((prev) => {
        const updated = { ...prev }
        delete updated[currentStep]
        return updated
      })
    }
  }

  const calculateMonthlyPayment = React.useCallback(() => {
    const price = parseFloat(formData.purchasePrice || '0')
    const down = parseFloat(formData.downPayment || '0')
    const term = parseFloat(formData.installmentTerm || '0')

    if (price > 0 && term > 0) {
      const remaining = price - down
      const monthly = remaining / term
      handleInputChange('monthlyPayment', monthly.toFixed(2))
    }
  }, [formData.purchasePrice, formData.downPayment, formData.installmentTerm])

  React.useEffect(() => {
    calculateMonthlyPayment()
  }, [calculateMonthlyPayment])

  // Auto-fill form fields from user profile (useMe)
  React.useEffect(() => {
    if (meLoading || !meUser) {
      return
    }

    setFormData((prev) => {
      const updated: Partial<FormData> = { ...prev }

      // Fill email from session
      if (meUser.email && !prev.email) {
        updated.email = meUser.email
      }

      // Fill phone from profile if available
      if (meUser.phone && !prev.phoneNumber) {
        updated.phoneNumber = normalizePhoneToE164(meUser.phone) || ''
      }


      return updated
    })
  }, [meUser, meLoading])

  // Auto-fill form fields from human profile
  React.useEffect(() => {
    if (!human) {
      return
    }

    setFormData((prev) => {
      const updated: Partial<FormData> = { ...prev }

      // Parse dataIn
      let dataIn: Record<string, any> = {}
      if (human.dataIn) {
        try {
          dataIn = typeof human.dataIn === 'string' ? JSON.parse(human.dataIn) : human.dataIn
        } catch (error) {
          console.error('Ошибка при парсинге human.dataIn:', error)
          dataIn = {}
        }
      }

      // Fill ФИО: use separate fields from dataIn directly, without validation
      // Use values exactly as they are in dataIn
      if (!prev.lastName && dataIn.lastName) {
        updated.lastName = String(dataIn.lastName).trim()
      }
      if (!prev.firstName && dataIn.firstName) {
        updated.firstName = String(dataIn.firstName).trim()
      }
      if (!prev.middleName && dataIn.middleName) {
        updated.middleName = String(dataIn.middleName).trim()
      }

      // Fill email
      if (human.email && !prev.email) {
        updated.email = human.email
      }

      // Fill date of birth
      if (human.birthday && !prev.dateOfBirth) {
        const birthdayDate = new Date(human.birthday)
        if (!isNaN(birthdayDate.getTime())) {
          updated.dateOfBirth = birthdayDate.toISOString().split('T')[0]
        }
      }

      // Fill phone from dataIn
      if (dataIn.phone && !prev.phoneNumber) {
        updated.phoneNumber = normalizePhoneToE164(dataIn.phone) || ''
      }
      if (dataIn.dateOfBirth && !prev.dateOfBirth) {
        updated.dateOfBirth = dataIn.dateOfBirth
      }
      if (dataIn.placeOfBirth && !prev.placeOfBirth) {
        updated.placeOfBirth = dataIn.placeOfBirth
      }
      if (dataIn.citizenship && !prev.citizenship) {
        updated.citizenship = dataIn.citizenship
      }
      if (dataIn.maritalStatus && !prev.maritalStatus) {
        updated.maritalStatus = dataIn.maritalStatus
      }
      if (dataIn.numberOfChildren && !prev.numberOfChildren) {
        updated.numberOfChildren = String(dataIn.numberOfChildren)
      }

      // Fill Паспортные данные from dataIn
      if (dataIn.passportSeries && !prev.passportSeries) {
        updated.passportSeries = dataIn.passportSeries
      }
      if (dataIn.passportNumber && !prev.passportNumber) {
        updated.passportNumber = dataIn.passportNumber
      }
      if (dataIn.passportIssueDate && !prev.passportIssueDate) {
        updated.passportIssueDate = dataIn.passportIssueDate
      }
      if (dataIn.passportIssuedBy && !prev.passportIssuedBy) {
        updated.passportIssuedBy = dataIn.passportIssuedBy
      }
      if (dataIn.passportDivisionCode && !prev.passportDivisionCode) {
        updated.passportDivisionCode = dataIn.passportDivisionCode
      }
      if (dataIn.inn && !prev.inn) {
        updated.inn = dataIn.inn
      }
      if (dataIn.snils && !prev.snils) {
        updated.snils = dataIn.snils
      }

      // Fill Финансовая информация from dataIn
      if (dataIn.employmentInfo_sb && !prev.employmentInfo_sb) {
        updated.employmentInfo_sb = dataIn.employmentInfo_sb
      }
      if (dataIn.officialIncome_sb && !prev.officialIncome_sb) {
        updated.officialIncome_sb = dataIn.officialIncome_sb
      }
      if (dataIn.additionalIncome_sb && !prev.additionalIncome_sb) {
        updated.additionalIncome_sb = dataIn.additionalIncome_sb
      }
      if (dataIn.monthlyIncome && !prev.monthlyIncome) {
        updated.monthlyIncome = String(dataIn.monthlyIncome)
      }
      if (dataIn.monthlyExpenses && !prev.monthlyExpenses) {
        updated.monthlyExpenses = String(dataIn.monthlyExpenses)
      }
      if (dataIn.workPlace && !prev.workPlace) {
        updated.workPlace = dataIn.workPlace
      }
      if (dataIn.workExperience && !prev.workExperience) {
        updated.workExperience = dataIn.workExperience
      }

      // Fill Адреса from dataIn
      if (dataIn.permanentAddress && !prev.permanentAddress) {
        updated.permanentAddress = dataIn.permanentAddress
      }
      if (dataIn.registrationAddress && !prev.registrationAddress) {
        updated.registrationAddress = dataIn.registrationAddress
      }

      return updated
    })
  }, [human])

  // Auto-fill empty fields with test data for development (after 5 seconds delay)
  React.useEffect(() => {
    // Only in development mode
    if (process.env.NODE_ENV === 'production') {
      return
    }

    const timer = setTimeout(() => {
      setFormData((prev) => {
        const updated: Partial<FormData> = { ...prev }

        // Only fill fields that are empty or falsy
        if (!prev.firstName) updated.firstName = 'Иван'
        if (!prev.lastName) updated.lastName = 'Иванов'
        if (!prev.middleName) updated.middleName = 'Иванович'
        if (!prev.phoneNumber) updated.phoneNumber = '+79991234567'
        if (!prev.email) updated.email = 'ivanov@example.com'
        if (!prev.dateOfBirth) updated.dateOfBirth = '1990-01-15'
        if (!prev.placeOfBirth) updated.placeOfBirth = 'г. Москва'
        if (!prev.citizenship) updated.citizenship = 'РФ'
        if (!prev.passportSeries) updated.passportSeries = '1234'
        if (!prev.passportNumber) updated.passportNumber = '567890'
        if (!prev.passportIssueDate) updated.passportIssueDate = '2010-05-20'
        if (!prev.passportIssuedBy) updated.passportIssuedBy = 'УФМС России по г. Москве'
        if (!prev.passportDivisionCode) updated.passportDivisionCode = '123-456'
        if (!prev.inn) updated.inn = '123456789012'
        if (!prev.snils) updated.snils = '123-456-789 12'
        if (!prev.maritalStatus) updated.maritalStatus = 'married'
        if (!prev.numberOfChildren) updated.numberOfChildren = '2'
        if (!prev.productName) updated.productName = 'Смартфон Apple iPhone 15 Pro 256GB'
        if (!prev.productPrice) updated.productPrice = '95000'
        if (!prev.purchaseLocation) updated.purchaseLocation = 'М.Видео, г. Москва'
        if (!prev.permanentAddress) updated.permanentAddress = 'г. Москва, ул. Ленина, д. 1, кв. 10'
        if (!prev.registrationAddress) updated.registrationAddress = 'г. Москва, ул. Ленина, д. 1, кв. 10'

        // Product and Terms
        if (!prev.comfortableMonthlyPayment) updated.comfortableMonthlyPayment = '15000'
        if (!prev.purchasePrice) updated.purchasePrice = '95000'
        if (!prev.downPayment) updated.downPayment = '20000'
        if (!prev.installmentTerm) updated.installmentTerm = '6'
        if (!prev.partnerLocation) updated.partnerLocation = 'М.Видео, ТЦ Мега, г. Москва'
        if (!prev.convenientPaymentDate) updated.convenientPaymentDate = '15'

        // Security Review (СБ) - only if not a client
        if (!isClient) {
          if (!prev.fsspInfo_sb) updated.fsspInfo_sb = 'Проверка ФССП: задолженностей не обнаружено'
          if (!prev.getcontactInfo_sb) updated.getcontactInfo_sb = 'GetContact: информация проверена, контакты подтверждены'
          if (!prev.purchasePurpose_sb) updated.purchasePurpose_sb = 'Покупка для личного использования'
          if (!prev.referralSource_sb) updated.referralSource_sb = 'Реклама в интернете'
          if (!prev.employmentInfo_sb) updated.employmentInfo_sb = 'ООО "Рога и Копыта", менеджер, стаж 3 года'
          if (!prev.additionalIncome_sb) updated.additionalIncome_sb = 'Дополнительных доходов не заявлено'
          if (!prev.officialIncome_sb) updated.officialIncome_sb = 'Официальный доход: 50000 руб/мес'
          if (!prev.maritalStatus_sb) updated.maritalStatus_sb = 'married'
          if (!prev.childrenInfo_sb) updated.childrenInfo_sb = '2 ребенка: 5 лет и 8 лет'
          if (!prev.creditHistory_sb) updated.creditHistory_sb = 'Действующих кредитов нет. Ранее был кредит в Сбербанке, закрыт досрочно'
          if (!prev.collateralInfo_sb) updated.collateralInfo_sb = 'Не указано'
          if (!prev.housingInfo_sb) updated.housingInfo_sb = 'Собственное жилье, ипотека'
          if (!prev.additionalContact_sb) updated.additionalContact_sb = '+79997654321'
          if (!prev.relativesContactPermission_sb) updated.relativesContactPermission_sb = 'Готов предоставить контакт родителей'
          if (!prev.localFeedback_sb) updated.localFeedback_sb = 'Отзыв от соседей: положительный, ответственный человек'
          if (!prev.psychologicalAssessment_sb) updated.psychologicalAssessment_sb = 'Клиент спокоен, адекватен, коммуникабелен. Рисков не выявлено.'
        }

        // Guarantor 1 (П1)
        if (!isClient) {
          if (!prev.responsibleAgent_p1) updated.responsibleAgent_p1 = 'Иванов Иван Иванович'
          if (!prev.fsspInfo_p1) updated.fsspInfo_p1 = 'Проверка ФССП: задолженностей не обнаружено'
          if (!prev.getcontactInfo_p1) updated.getcontactInfo_p1 = 'GetContact: информация проверена'
          if (!prev.relationship_p1) updated.relationship_p1 = 'Супруг(а)'
          if (!prev.fullName_p1) updated.fullName_p1 = 'Иванова Мария Ивановна'
          if (!prev.phoneNumber_p1) updated.phoneNumber_p1 = '+79991112233'
          if (!prev.address_p1) updated.address_p1 = 'г. Москва, ул. Ленина, д. 1, кв. 10'
          if (!prev.employmentIncome_p1) updated.employmentIncome_p1 = 'ООО "Компания", бухгалтер, 40000 руб/мес'
          if (!prev.maritalStatus_p1) updated.maritalStatus_p1 = 'married'
          if (!prev.childrenInfo_p1) updated.childrenInfo_p1 = '2 ребенка: 5 лет и 8 лет'
          if (!prev.additionalIncome_p1) updated.additionalIncome_p1 = 'Дополнительных доходов нет'
          if (!prev.creditHistory_p1) updated.creditHistory_p1 = 'Действующих кредитов нет'
          if (!prev.collateralInfo_p1) updated.collateralInfo_p1 = 'Не указано'
          if (!prev.housingInfo_p1) updated.housingInfo_p1 = 'Собственное жилье'
          if (!prev.isNewClient_p1) updated.isNewClient_p1 = 'Новый клиент'
          if (!prev.psychologicalAssessment_p1) updated.psychologicalAssessment_p1 = 'Поручитель надежный, коммуникабельный'
          if (!prev.additionalPhoneNumber_p1) updated.additionalPhoneNumber_p1 = ''
        }

        // Guarantor 2 (П2)
        if (!isClient) {
          if (!prev.fsspInfo_p2) updated.fsspInfo_p2 = ''
          if (!prev.getcontactInfo_p2) updated.getcontactInfo_p2 = ''
          if (!prev.fullName_p2) updated.fullName_p2 = ''
          if (!prev.phoneNumber_p2) updated.phoneNumber_p2 = ''
          if (!prev.relationship_p2) updated.relationship_p2 = ''
          if (!prev.address_p2) updated.address_p2 = ''
          if (!prev.employmentIncome_p2) updated.employmentIncome_p2 = ''
          if (!prev.maritalStatus_p2) updated.maritalStatus_p2 = ''
          if (!prev.childrenInfo_p2) updated.childrenInfo_p2 = ''
          if (!prev.creditHistory_p2) updated.creditHistory_p2 = ''
          if (!prev.additionalIncome_p2) updated.additionalIncome_p2 = ''
          if (!prev.relativesContact_p2) updated.relativesContact_p2 = ''
          if (!prev.isNewClient_p2) updated.isNewClient_p2 = ''
          if (!prev.psychologicalAssessment_p2) updated.psychologicalAssessment_p2 = ''
          if (!prev.additionalPhoneNumber_p2) updated.additionalPhoneNumber_p2 = ''
        }

        return updated
      })
    }, 5000) // 5 seconds delay

    return () => clearTimeout(timer)
  }, [isClient]) // Re-run if isClient changes

  // Функция валидации русских букв
  const validateRussianText = (text: string | null | undefined, fieldName: string): string | null => {
    if (!text) return null // Пустые значения проверяются отдельно как required
    
    const russianPattern = /^[А-Яа-яЁё\s-]+$/
    if (!russianPattern.test(text.trim())) {
      return `${fieldName} должно содержать только русские буквы, пробелы и дефисы`
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)

    // Validate all steps before submission
    const allErrors: Record<number, string[]> = {}
    let hasErrors = false
    
    for (let i = 0; i < sections.length; i++) {
      const errors = validateStep(i)
      if (errors.length > 0) {
        allErrors[i] = errors
        hasErrors = true
      }
    }
    
    if (hasErrors) {
      setStepErrors(allErrors)
      setError('Пожалуйста, исправьте ошибки во всех шагах формы')
      // Scroll to first step with errors
      const firstErrorStep = Math.min(...Object.keys(allErrors).map(Number))
      goToStep(firstErrorStep)
      return
    }

    if (!formData.consentToProcessData) {
      setError('Необходимо дать согласие на обработку персональных данных')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Валидация русских букв в имени, фамилии и отчестве
      const lastNameError = validateRussianText(formData.lastName, 'Фамилия')
      if (lastNameError) {
        setError(lastNameError)
        setSubmitting(false)
        return
      }

      const firstNameError = validateRussianText(formData.firstName, 'Имя')
      if (firstNameError) {
        setError(firstNameError)
        setSubmitting(false)
        return
      }

      if (formData.middleName) {
        const middleNameError = validateRussianText(formData.middleName, 'Отчество')
        if (middleNameError) {
          setError(middleNameError)
          setSubmitting(false)
          return
        }
      }

      // documentPhotos is now optional for clients - can be requested later via ADDITIONAL_INFO_REQUESTED

      // Prepare FormData for multipart/form-data
      const formDataToSend = new FormData()

      // Add all form fields as strings
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'documentPhotos' || key === 'passportPhoto_p1' || key === 'passportPhoto_p2' || key === 'contractDocuments') {
          // Skip files, they will be added separately
          return
        }
        if (key === 'selectedGuarantors') {
          // Handle selectedGuarantors array
          if (Array.isArray(value) && value.length > 0) {
            formDataToSend.append(key, JSON.stringify(value))
          }
          return
        }
        if (value !== null && value !== undefined) {
          if (typeof value === 'boolean') {
            formDataToSend.append(key, value ? 'true' : 'false')
          } else if (Array.isArray(value)) {
            // Skip arrays for now (they might be File arrays)
            return
          } else {
            formDataToSend.append(key, String(value))
          }
        }
      })

      // Add new guarantors array
      if (newGuarantors.length > 0) {
        formDataToSend.append('newGuarantors', JSON.stringify(newGuarantors))
      }

      // Add files
      if (formData.documentPhotos && formData.documentPhotos.length > 0) {
        formData.documentPhotos.forEach((file) => {
          formDataToSend.append('documentPhotos', file)
        })
      }

      const response = await fetch(submitUrl, {
        method: submitMethod,
        credentials: 'include',
        body: formDataToSend,
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error || 'Failed to submit application')
      }

      await response.json().catch(() => null)
      // Redirect after success
      router.push(successRedirectUrl)
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  // Simplified Step 1: Contacts (for clients)
  const renderContacts = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="lastName">
            Фамилия * <span className="text-muted-foreground">(только русские буквы)</span>
          </Label>
          <Input
            id="lastName"
            value={formData.lastName || ''}
            onChange={(e) => {
              const value = e.target.value
              const filtered = value.replace(/[^А-Яа-яЁё\s-]/g, '')
              handleInputChange('lastName', filtered)
            }}
            required
            pattern="^[А-Яа-яЁё\s-]+$"
            className={`${formData.lastName && !/^[А-Яа-яЁё\s-]+$/.test(formData.lastName) ? 'border-red-500' : ''} bg-background`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="firstName">
            Имя * <span className="text-muted-foreground">(только русские буквы)</span>
          </Label>
          <Input
            id="firstName"
            value={formData.firstName || ''}
            onChange={(e) => {
              const value = e.target.value
              const filtered = value.replace(/[^А-Яа-яЁё\s-]/g, '')
              handleInputChange('firstName', filtered)
            }}
            required
            pattern="^[А-Яа-яЁё\s-]+$"
            className={`${formData.firstName && !/^[А-Яа-яЁё\s-]+$/.test(formData.firstName) ? 'border-red-500' : ''} bg-background`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="middleName">
            Отчество <span className="text-muted-foreground">(только русские буквы)</span>
          </Label>
          <Input
            id="middleName"
            value={formData.middleName || ''}
            onChange={(e) => {
              const value = e.target.value
              const filtered = value.replace(/[^А-Яа-яЁё\s-]/g, '')
              handleInputChange('middleName', filtered)
            }}
            pattern="^[А-Яа-яЁё\s-]+$"
            className={`${formData.middleName && !/^[А-Яа-яЁё\s-]+$/.test(formData.middleName) ? 'border-red-500' : ''} bg-background`} 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Телефон *</Label>
        <PhoneInput
          defaultCountry="RU"
          placeholder="+7 (999) 999-99-99"
          value={(formData.phoneNumber || '') as E164Number}
          onChange={(value) => handleInputChange('phoneNumber', value ?? '')}
          hideCountrySelector
          className="bg-background"
        />
      </div>

      {/* Additional fields accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="additional-info">
          <AccordionTrigger className="text-sm">
            Дополнительные сведения (необязательно)
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Дата рождения</Label>
                <DateTimePicker
                  mode="date"
                  value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : null}
                  onChange={(date) => {
                    const dateString = date ? date.toISOString().split('T')[0] : ''
                    handleInputChange('dateOfBirth', dateString)
                  }}
                  placeholder="Выберите дату рождения"
                  dateFormat="dd.MM.yyyy"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placeOfBirth">Место рождения</Label>
                <Input
                  id="placeOfBirth"
                  value={formData.placeOfBirth || ''}
                  onChange={(e) => handleInputChange('placeOfBirth', e.target.value)}
                  placeholder="Город, область"
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="citizenship">Гражданство</Label>
                <Input
                  id="citizenship"
                  value={formData.citizenship || ''}
                  onChange={(e) => handleInputChange('citizenship', e.target.value)}
                  placeholder="РФ"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Семейное положение</Label>
                <Select
                  value={formData.maritalStatus || ''}
                  onValueChange={(value) => handleInputChange('maritalStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите семейное положение" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Холост/не замужем</SelectItem>
                    <SelectItem value="married">Женат/замужем</SelectItem>
                    <SelectItem value="divorced">В разводе</SelectItem>
                    <SelectItem value="widowed">Вдова/вдовец</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfChildren">Количество детей</Label>
              <Input
                id="numberOfChildren"
                type="number"
                min="0"
                value={formData.numberOfChildren || ''}
                onChange={(e) => handleInputChange('numberOfChildren', e.target.value)}
                placeholder="0"
                className="bg-background"
              />
            </div>

            {/* Passport Info */}
            <div className="pt-4 border-t space-y-4">
              <h4 className="font-medium text-sm">Паспортные данные</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="passportSeries">Серия паспорта</Label>
                  <Input
                    id="passportSeries"
                    value={formData.passportSeries || ''}
                    onChange={(e) => handleInputChange('passportSeries', e.target.value)}
                    placeholder="1234"
                    maxLength={4}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passportNumber">Номер паспорта</Label>
                  <Input
                    id="passportNumber"
                    value={formData.passportNumber || ''}
                    onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                    placeholder="567890"
                    maxLength={6}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passportIssueDate">Дата выдачи паспорта</Label>
                <DateTimePicker
                  mode="date"
                  value={formData.passportIssueDate ? new Date(formData.passportIssueDate) : null}
                  onChange={(date) => {
                    const dateString = date ? date.toISOString().split('T')[0] : ''
                    handleInputChange('passportIssueDate', dateString)
                  }}
                  placeholder="Выберите дату выдачи"
                  dateFormat="dd.MM.yyyy"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passportIssuedBy">Кем выдан паспорт</Label>
                <Textarea
                  id="passportIssuedBy"
                  value={formData.passportIssuedBy || ''}
                  onChange={(e) => handleInputChange('passportIssuedBy', e.target.value)}
                  placeholder="Наименование органа, выдавшего паспорт"
                  rows={2}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passportDivisionCode">Код подразделения</Label>
                <Input
                  id="passportDivisionCode"
                  value={formData.passportDivisionCode || ''}
                  onChange={(e) => handleInputChange('passportDivisionCode', e.target.value)}
                  placeholder="123-456"
                  pattern="[0-9]{3}-[0-9]{3}"
                  className="bg-background"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inn">ИНН</Label>
                  <Input
                    id="inn"
                    value={formData.inn || ''}
                    onChange={(e) => handleInputChange('inn', e.target.value)}
                    placeholder="123456789012"
                    maxLength={12}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="snils">СНИЛС</Label>
                  <Input
                    id="snils"
                    value={formData.snils || ''}
                    onChange={(e) => handleInputChange('snils', e.target.value)}
                    placeholder="123-456-789 12"
                    maxLength={14}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="pt-4 border-t space-y-4">
              <h4 className="font-medium text-sm">Адреса</h4>
              <div className="space-y-2">
                <Label htmlFor="permanentAddress">Постоянное место жительства (прописка)</Label>
                <Textarea
                  id="permanentAddress"
                  value={formData.permanentAddress || ''}
                  onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
                  placeholder="Полный адрес регистрации"
                  rows={3}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationAddress">Адрес фактического проживания</Label>
                <Textarea
                  id="registrationAddress"
                  value={formData.registrationAddress || ''}
                  onChange={(e) => handleInputChange('registrationAddress', e.target.value)}
                  placeholder="Полный адрес фактического проживания (если отличается от прописки)"
                  rows={3}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Financial Info */}
            <div className="pt-4 border-t space-y-4">
              <h4 className="font-medium text-sm">Финансовая информация</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monthlyIncome">Доход в месяц (руб.)</Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    value={formData.monthlyIncome || ''}
                    onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                    placeholder="Например: 50000"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyExpenses">Расходы в месяц (руб.)</Label>
                  <Input
                    id="monthlyExpenses"
                    type="number"
                    value={formData.monthlyExpenses || ''}
                    onChange={(e) => handleInputChange('monthlyExpenses', e.target.value)}
                    placeholder="Например: 30000"
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workPlace">Место работы</Label>
                  <Input
                    id="workPlace"
                    value={formData.workPlace || ''}
                    onChange={(e) => handleInputChange('workPlace', e.target.value)}
                    placeholder="Например: ООО 'Компания', менеджер"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workExperience">Стаж работы</Label>
                  <Input
                    id="workExperience"
                    value={formData.workExperience || ''}
                    onChange={(e) => handleInputChange('workExperience', e.target.value)}
                    placeholder="Например: 3 года"
                    className="bg-background"
                    />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )

  // Step 1: Personal Info (keep for admin/staff)
  const renderPersonalInfo = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="lastName">
            Фамилия * <span className="text-muted-foreground">(только русские буквы)</span>
          </Label>
          <Input
            id="lastName"
            value={formData.lastName || ''}
            onChange={(e) => {
              const value = e.target.value
              const filtered = value.replace(/[^А-Яа-яЁё\s-]/g, '')
              handleInputChange('lastName', filtered)
            }}
            required
            pattern="^[А-Яа-яЁё\s-]+$"
            className={`${formData.lastName && !/^[А-Яа-яЁё\s-]+$/.test(formData.lastName) ? 'border-red-500' : ''} bg-background`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="firstName">
            Имя * <span className="text-muted-foreground">(только русские буквы)</span>
          </Label>
          <Input
            id="firstName"
            value={formData.firstName || ''}
            onChange={(e) => {
              const value = e.target.value
              const filtered = value.replace(/[^А-Яа-яЁё\s-]/g, '')
              handleInputChange('firstName', filtered)
            }}
            required
            pattern="^[А-Яа-яЁё\s-]+$"
            className={`${formData.firstName && !/^[А-Яа-яЁё\s-]+$/.test(formData.firstName) ? 'border-red-500' : ''} bg-background`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="middleName">
            Отчество <span className="text-muted-foreground">(только русские буквы)</span>
          </Label>
          <Input
            id="middleName"
            value={formData.middleName || ''}
            onChange={(e) => {
              const value = e.target.value
              const filtered = value.replace(/[^А-Яа-яЁё\s-]/g, '')
              handleInputChange('middleName', filtered)
            }}
            pattern="^[А-Яа-яЁё\s-]+$"
            className={`${formData.middleName && !/^[А-Яа-яЁё\s-]+$/.test(formData.middleName) ? 'border-red-500' : ''} bg-background`}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Дата рождения *</Label>
          <DateTimePicker
            mode="date"
            value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : null}
            onChange={(date) => {
              const dateString = date ? date.toISOString().split('T')[0] : ''
              handleInputChange('dateOfBirth', dateString)
            }}
            placeholder="Выберите дату рождения"
            dateFormat="dd.MM.yyyy"
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="placeOfBirth">Место рождения *</Label>
          <Input
            id="placeOfBirth"
            value={formData.placeOfBirth || ''}
            onChange={(e) => handleInputChange('placeOfBirth', e.target.value)}
            placeholder="Город, область"
            required
            className="bg-background"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Телефон *</Label>
          <PhoneInput
            defaultCountry="RU"
            placeholder="+7 (999) 999-99-99"
            value={(formData.phoneNumber || '') as E164Number}
            onChange={(value) => handleInputChange('phoneNumber', value ?? '')}
            hideCountrySelector
            className="bg-background"
            />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={isClient}
            className={`${isClient ? "bg-background  cursor-not-allowed" : ""} bg-background`}
            placeholder="example@mail.ru"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="citizenship">Гражданство *</Label>
          <Input
            id="citizenship"
            value={formData.citizenship || ''}
            onChange={(e) => handleInputChange('citizenship', e.target.value)}
            placeholder="РФ"
            required
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maritalStatus">Семейное положение</Label>
          <Select
            value={formData.maritalStatus || ''}
            onValueChange={(value) => handleInputChange('maritalStatus', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите семейное положение" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Холост/не замужем</SelectItem>
              <SelectItem value="married">Женат/замужем</SelectItem>
              <SelectItem value="divorced">В разводе</SelectItem>
              <SelectItem value="widowed">Вдова/вдовец</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="numberOfChildren">Количество детей</Label>
        <Input
          id="numberOfChildren"
          type="number"
          min="0"
          value={formData.numberOfChildren || ''}
          onChange={(e) => handleInputChange('numberOfChildren', e.target.value)}
          placeholder="0"
          className="bg-background"
        />
      </div>
    </div>
  )

  // Step 2: Financial Info
  const renderFinancialInfo = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="monthlyIncome">Доход в месяц (руб.) *</Label>
          <Input
            id="monthlyIncome"
            type="number"
            value={formData.monthlyIncome || ''}
            onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
            placeholder="Например: 50000"
            required
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlyExpenses">Расходы в месяц (руб.)</Label>
          <Input
            id="monthlyExpenses"
            type="number"
            value={formData.monthlyExpenses || ''}
            onChange={(e) => handleInputChange('monthlyExpenses', e.target.value)}
            placeholder="Например: 30000"
            className="bg-background"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workPlace">Место работы *</Label>
          <Input
            id="workPlace"
            value={formData.workPlace || ''}
            onChange={(e) => handleInputChange('workPlace', e.target.value)}
            placeholder="Например: ООО 'Компания', менеджер"
            required
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workExperience">Стаж работы</Label>
          <Input
            id="workExperience"
            value={formData.workExperience || ''}
            onChange={(e) => handleInputChange('workExperience', e.target.value)}
            placeholder="Например: 3 года"
            className="bg-background"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="employmentInfo_sb">Место работы (организация), должность и стаж на текущем месте (дополнительная информация)</Label>
        <Textarea
          id="employmentInfo_sb"
          value={formData.employmentInfo_sb || ''}
          onChange={(e) => handleInputChange('employmentInfo_sb', e.target.value)}
          placeholder="Дополнительная информация о месте работы, должности и стаже"
          rows={3}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="officialIncome_sb">Официальное трудоустройство и сумма доходов по отдельности (дополнительная информация)</Label>
        <Textarea
          id="officialIncome_sb"
          value={formData.officialIncome_sb || ''}
          onChange={(e) => handleInputChange('officialIncome_sb', e.target.value)}
          placeholder="Дополнительная информация об официальном трудоустройстве и доходах"
          rows={3}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="additionalIncome_sb">Пенсии, выплаты и другие доп. доходы</Label>
        <Textarea
          id="additionalIncome_sb"
          value={formData.additionalIncome_sb || ''}
          onChange={(e) => handleInputChange('additionalIncome_sb', e.target.value)}
          placeholder="Дополнительные источники дохода (если есть)"
          rows={3}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="creditHistory_sb">Имеются ли действующие кредиты/рассрочки? Где? Суммы платежей? А до этого были?</Label>
        <Textarea
          id="creditHistory_sb"
          value={formData.creditHistory_sb || ''}
          onChange={(e) => handleInputChange('creditHistory_sb', e.target.value)}
          placeholder="Информация о кредитной истории"
          rows={3}
          className="bg-background"
        />
      </div>
    </div>
  )

  // Step 3: Passport Info
  const renderPassportInfo = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="passportSeries">Серия паспорта *</Label>
          <Input
            id="passportSeries"
            value={formData.passportSeries || ''}
            onChange={(e) => handleInputChange('passportSeries', e.target.value)}
            placeholder="1234"
            maxLength={4}
            required
            className="bg-background"
            />
        </div>
        <div className="space-y-2">
          <Label htmlFor="passportNumber">Номер паспорта *</Label>
          <Input
            id="passportNumber"
            value={formData.passportNumber || ''}
            onChange={(e) => handleInputChange('passportNumber', e.target.value)}
            placeholder="567890"
            maxLength={6}
            required
            className="bg-background"
            />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="passportIssueDate">Дата выдачи паспорта *</Label>
        <DateTimePicker
          mode="date"
          value={formData.passportIssueDate ? new Date(formData.passportIssueDate) : null}
          onChange={(date) => {
            const dateString = date ? date.toISOString().split('T')[0] : ''
            handleInputChange('passportIssueDate', dateString)
          }}
          placeholder="Выберите дату выдачи"
          dateFormat="dd.MM.yyyy"
          className="w-full bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="passportIssuedBy">Кем выдан паспорт *</Label>
        <Textarea
          id="passportIssuedBy"
          value={formData.passportIssuedBy || ''}
          onChange={(e) => handleInputChange('passportIssuedBy', e.target.value)}
          placeholder="Наименование органа, выдавшего паспорт"
          rows={2}
          required
          className="bg-background"
          />
      </div>

      <div className="space-y-2">
        <Label htmlFor="passportDivisionCode">Код подразделения *</Label>
        <Input
          id="passportDivisionCode"
          value={formData.passportDivisionCode || ''}
          onChange={(e) => handleInputChange('passportDivisionCode', e.target.value)}
          placeholder="123-456"
          pattern="[0-9]{3}-[0-9]{3}"
          required
          className="bg-background"
          />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="inn">ИНН</Label>
          <Input
            id="inn"
            value={formData.inn || ''}
            onChange={(e) => handleInputChange('inn', e.target.value)}
            placeholder="123456789012"
            maxLength={12}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="snils">СНИЛС</Label>
          <Input
            id="snils"
            value={formData.snils || ''}
            onChange={(e) => handleInputChange('snils', e.target.value)}
            placeholder="123-456-789 12"
            maxLength={14}
            className="bg-background"
          />
        </div>
      </div>
    </div>
  )

  // Step 4: Addresses
  const renderAddresses = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="permanentAddress">Постоянное место жительства (прописка) *</Label>
        <Textarea
          id="permanentAddress"
          value={formData.permanentAddress || ''}
          onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
          placeholder="Полный адрес регистрации"
          rows={3}
          required
          className="bg-background"
          />
      </div>

      <div className="space-y-2">
        <Label htmlFor="registrationAddress">Адрес фактического проживания</Label>
        <Textarea
          id="registrationAddress"
          value={formData.registrationAddress || ''}
          onChange={(e) => handleInputChange('registrationAddress', e.target.value)}
          placeholder="Полный адрес фактического проживания (если отличается от прописки)"
          rows={3}
          className="bg-background"
          />
      </div>
    </div>
  )

  // Keep old function for admin/staff
  const renderClientPrimaryInfo = () => (
    <div className="space-y-4">
      {renderPersonalInfo()}
      {renderPassportInfo()}
      {renderAddresses()}
      {renderFinancialInfo()}
    </div>
  )

  // Simplified Product Info for clients
  const renderProductInfo = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="purchasePrice">Цена товара (стоимость покупки) *</Label>
          <Input
            id="purchasePrice"
            type="number"
            value={formData.purchasePrice || ''}
            onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
            placeholder="Например: 50000"
            required
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="downPayment">Первый взнос</Label>
          <Input
            id="downPayment"
            type="number"
            value={formData.downPayment || ''}
            onChange={(e) => handleInputChange('downPayment', e.target.value)}
            placeholder="0"
            className="bg-background"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="installmentTerm">Срок рассрочки *</Label>
          <span className="text-sm font-medium">
            {(() => {
              const termValue = Math.max(3, Math.min(24, parseInt(formData.installmentTerm || '6')))
              return `${termValue} ${getMonthWord(termValue)}`
            })()}
          </span>
        </div>
        <Slider
          id="installmentTerm"
          min={3}
          max={24}
          step={1}
          value={[Math.max(3, Math.min(24, parseInt(formData.installmentTerm || '6')))]}
          onValueChange={(value) => handleInputChange('installmentTerm', String(value[0]))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>3 {getMonthWord(3)}</span>
          <span>24 {getMonthWord(24)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="productName">Название товара</Label>
        <Input
          id="productName"
          value={formData.productName || ''}
          onChange={(e) => handleInputChange('productName', e.target.value)}
          placeholder="Например: Смартфон iPhone 15"
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="documentPhotos">
          Фото товара (необязательно, можно загрузить позже)
        </Label>
        <Input
          id="documentPhotos"
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            handleInputChange('documentPhotos', files as File[])
          }}
          className="bg-background"
          />
        <p className="text-xs text-muted-foreground">
          Если не загрузите сейчас, мы можем запросить фото позже
        </p>
      </div>

      {/* Additional product fields */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="additional-product-info">
          <AccordionTrigger className="text-sm">
            Дополнительная информация о покупке (необязательно)
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseLocation">Место покупки</Label>
              <Input
                id="purchaseLocation"
                value={formData.purchaseLocation || ''}
                onChange={(e) => handleInputChange('purchaseLocation', e.target.value)}
                placeholder="Например: Магазин электроники"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnerLocation">У какого партнера или где находится товар?</Label>
              <Input
                id="partnerLocation"
                value={formData.partnerLocation || ''}
                onChange={(e) => handleInputChange('partnerLocation', e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comfortableMonthlyPayment">Комфортный ежемесячный платеж</Label>
              <Input
                id="comfortableMonthlyPayment"
                type="number"
                value={formData.comfortableMonthlyPayment || ''}
                onChange={(e) => handleInputChange('comfortableMonthlyPayment', e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="convenientPaymentDate">Удобная дата для оплаты (число месяца)</Label>
              <Input
                id="convenientPaymentDate"
                type="number"
                min="1"
                max="31"
                value={formData.convenientPaymentDate || ''}
                onChange={(e) => handleInputChange('convenientPaymentDate', e.target.value)}
                className="bg-background"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )

  const renderProductAndTerms = () => {
    // Check if productAndTerms section is visible and open
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="documentPhotos">
            Фото товара *
          </Label>
          <Input
            id="documentPhotos"
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              handleInputChange('documentPhotos', files as File[])
            }}
            required
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
        <Label htmlFor="comfortableMonthlyPayment">Комфортный ежемесячный платеж</Label>
        <Input
          id="comfortableMonthlyPayment"
          type="number"
          value={formData.comfortableMonthlyPayment || ''}
          onChange={(e) => handleInputChange('comfortableMonthlyPayment', e.target.value)}
          className="bg-background"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="purchasePrice">Цена закупа (стоимость товара) *</Label>
          <Input
            id="purchasePrice"
            type="number"
            value={formData.purchasePrice || ''}
            onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
            required
            className="bg-background"
            />
        </div>
        <div className="space-y-2">
          <Label htmlFor="downPayment">Первый взнос *</Label>
          <Input
            id="downPayment"
            type="number"
            value={formData.downPayment || ''}
            onChange={(e) => handleInputChange('downPayment', e.target.value)}
            required
            className="bg-background"
            />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="installmentTerm">Срок рассрочки (в мес.) *</Label>
            <span className="text-sm font-medium">
              {(() => {
                const termValue = Math.max(3, Math.min(24, parseInt(formData.installmentTerm || '6')))
                return `${termValue} ${getMonthWord(termValue)}`
              })()}
            </span>
          </div>
          <Slider
            id="installmentTerm"
            min={3}
            max={24}
            step={1}
            value={[Math.max(3, Math.min(24, parseInt(formData.installmentTerm || '6')))]}
            onValueChange={(value) => handleInputChange('installmentTerm', String(value[0]))}
            className="w-full bg-background"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>3</span>
            <span>24</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="monthlyPayment">Ежемесячный платеж *</Label>
          <Input
            id="monthlyPayment"
            type="number"
            value={formData.monthlyPayment || ''}
            readOnly
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="markupAmount">Наценка в руб.</Label>
          <Input
            id="markupAmount"
            type="number"
            value={formData.markupAmount || ''}
            readOnly
            className="bg-background "
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="partnerLocation">У какого партнера или где находится товар?</Label>
        <Input
          id="partnerLocation"
          value={formData.partnerLocation || ''}
          onChange={(e) => handleInputChange('partnerLocation', e.target.value)}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="convenientPaymentDate">Удобная дата для оплаты (число месяца)</Label>
        <Input
          id="convenientPaymentDate"
          type="number"
          min="1"
          max="31"
          value={formData.convenientPaymentDate || ''}
          onChange={(e) => handleInputChange('convenientPaymentDate', e.target.value)}
          className="bg-background"
          />
      </div>
    </div>
    )
  }

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'clientPrimaryInfo':
        return renderClientPrimaryInfo()
      case 'productAndTerms':
        return renderProductAndTerms()
      case 'securityReview':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Эта секция заполняется службой безопасности
            </p>
            <div className="space-y-2">
              <Label htmlFor="fsspInfo_sb">Информация из ФССП, и других баз. 1 (СБ) *</Label>
              <Textarea
                id="fsspInfo_sb"
                value={formData.fsspInfo_sb || ''}
                onChange={(e) => handleInputChange('fsspInfo_sb', e.target.value)}
                rows={3}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="getcontactInfo_sb">Информация из Гетконтакт (СБ) *</Label>
              <Textarea
                id="getcontactInfo_sb"
                value={formData.getcontactInfo_sb || ''}
                onChange={(e) => handleInputChange('getcontactInfo_sb', e.target.value)}
                rows={3}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasePurpose_sb">Цель покупки товара (СБ)</Label>
              <Textarea
                id="purchasePurpose_sb"
                value={formData.purchasePurpose_sb || ''}
                onChange={(e) => handleInputChange('purchasePurpose_sb', e.target.value)}
                rows={3}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralSource_sb">От кого перешли по ссылке (СБ)</Label>
              <Textarea
                id="referralSource_sb"
                value={formData.referralSource_sb || ''}
                onChange={(e) => handleInputChange('referralSource_sb', e.target.value)}
                rows={3}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentInfo_sb">Место работы (организация), должность и стаж на текущем месте (СБ) *</Label>
              <Textarea
                id="employmentInfo_sb"
                value={formData.employmentInfo_sb || ''}
                onChange={(e) => handleInputChange('employmentInfo_sb', e.target.value)}
                rows={3}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalIncome_sb">Пенсии, выплаты и другие доп. доходы (СБ)</Label>
              <Textarea
                id="additionalIncome_sb"
                value={formData.additionalIncome_sb || ''}
                onChange={(e) => handleInputChange('additionalIncome_sb', e.target.value)}
                rows={3}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="officialIncome_sb">Официальное трудоустройство и сумма доходов по отдельности (СБ) *</Label>
              <Textarea
                id="officialIncome_sb"
                value={formData.officialIncome_sb || ''}
                onChange={(e) => handleInputChange('officialIncome_sb', e.target.value)}
                rows={3}
                required
                className="bg-background"
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus_sb">Семейное положение клиента (СБ) *</Label>
              <Select
                value={formData.maritalStatus_sb || ''}
                onValueChange={(value) => handleInputChange('maritalStatus_sb', value)}
                required>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите семейное положение" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="married">Женат/замужем</SelectItem>
                  <SelectItem value="single">Холост/не замужем</SelectItem>
                  <SelectItem value="divorced">В разводе</SelectItem>
                  <SelectItem value="widowed">Вдова/вдовец</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="childrenInfo_sb">Дети (количество детей) клиента и их возраст (в диапазоне 0-10-20-30 лет) (СБ)</Label>
              <Textarea
                id="childrenInfo_sb"
                value={formData.childrenInfo_sb || ''}
                onChange={(e) => handleInputChange('childrenInfo_sb', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditHistory_sb">Имеются ли действующие кредиты/рассрочки? Где? Суммы платежей? А до этого были? (СБ) *</Label>
              <Textarea
                id="creditHistory_sb"
                value={formData.creditHistory_sb || ''}
                onChange={(e) => handleInputChange('creditHistory_sb', e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collateralInfo_sb">Есть ли имущество, чтобы при необходимости использовать в качестве залога? (СБ)</Label>
              <Textarea
                id="collateralInfo_sb"
                value={formData.collateralInfo_sb || ''}
                onChange={(e) => handleInputChange('collateralInfo_sb', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="housingInfo_sb">Имеется ли собственное жилье? Или съемное, или с родителями? (СБ)</Label>
              <Textarea
                id="housingInfo_sb"
                value={formData.housingInfo_sb || ''}
                onChange={(e) => handleInputChange('housingInfo_sb', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalContact_sb">Дополнительный номер (СБ) *</Label>
              <Input
                id="additionalContact_sb"
                type="tel"
                value={formData.additionalContact_sb || ''}
                onChange={(e) => handleInputChange('additionalContact_sb', e.target.value)}
                placeholder="+7 (___) ___-__-__"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relativesContactPermission_sb">Готовы ли предоставить контактный номер родителей, брата или сестры до 40 лет? (СБ)</Label>
              <Textarea
                id="relativesContactPermission_sb"
                value={formData.relativesContactPermission_sb || ''}
                onChange={(e) => handleInputChange('relativesContactPermission_sb', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="localFeedback_sb">Информация от других людей с местности клиента. (У кого спросили, что сказали, дословно) (СБ) *</Label>
              <Textarea
                id="localFeedback_sb"
                value={formData.localFeedback_sb || ''}
                onChange={(e) => handleInputChange('localFeedback_sb', e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="psychologicalAssessment_sb">Психологическая оценка клиента (подробный текст) (СБ) *</Label>
              <Textarea
                id="psychologicalAssessment_sb"
                value={formData.psychologicalAssessment_sb || ''}
                onChange={(e) => handleInputChange('psychologicalAssessment_sb', e.target.value)}
                rows={5}
                required
              />
            </div>
          </div>
        )
      case 'guarantor1':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="responsibleAgent_p1">Ответственный за рассмотрение (П1) *</Label>
              <Input
                id="responsibleAgent_p1"
                value={formData.responsibleAgent_p1 || ''}
                onChange={(e) => handleInputChange('responsibleAgent_p1', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fsspInfo_p1">Информация из ФССП, и других баз 2 (П1) *</Label>
              <Textarea
                id="fsspInfo_p1"
                value={formData.fsspInfo_p1 || ''}
                onChange={(e) => handleInputChange('fsspInfo_p1', e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="getcontactInfo_p1">Информация из Гетконтакт (П1) *</Label>
              <Textarea
                id="getcontactInfo_p1"
                value={formData.getcontactInfo_p1 || ''}
                onChange={(e) => handleInputChange('getcontactInfo_p1', e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship_p1">Кем приходится клиенту? (П1) *</Label>
              <Input
                id="relationship_p1"
                value={formData.relationship_p1 || ''}
                onChange={(e) => handleInputChange('relationship_p1', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName_p1">ФИО поручителя (П1)</Label>
              <Input
                id="fullName_p1"
                value={formData.fullName_p1 || ''}
                onChange={(e) => handleInputChange('fullName_p1', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passportPhoto_p1">Фото паспорта (П1)</Label>
              <Input
                id="passportPhoto_p1"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  handleInputChange('passportPhoto_p1', files as File[])
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber_p1">Номер телефона поручителя (спросить есть ли еще номер) (П1)</Label>
              <Input
                id="phoneNumber_p1"
                type="tel"
                value={formData.phoneNumber_p1 || ''}
                onChange={(e) => handleInputChange('phoneNumber_p1', e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_p1">Фактическое место жительства (П1) *</Label>
              <Textarea
                id="address_p1"
                value={formData.address_p1 || ''}
                onChange={(e) => handleInputChange('address_p1', e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentIncome_p1">Офиц. трудоустройство и сумма доходов отдельно (П1)</Label>
              <Textarea
                id="employmentIncome_p1"
                value={formData.employmentIncome_p1 || ''}
                onChange={(e) => handleInputChange('employmentIncome_p1', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus_p1">Семейное положение поручителя (П1) *</Label>
              <Input
                id="maritalStatus_p1"
                value={formData.maritalStatus_p1 || ''}
                onChange={(e) => handleInputChange('maritalStatus_p1', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="childrenInfo_p1">Дети (количество детей) клиента и их возраст (в диапазоне 0-10-20-30 лет) (П1)</Label>
              <Textarea
                id="childrenInfo_p1"
                value={formData.childrenInfo_p1 || ''}
                onChange={(e) => handleInputChange('childrenInfo_p1', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalIncome_p1">Пенсии, выплаты и другие доп. доходы (П1) *</Label>
              <Textarea
                id="additionalIncome_p1"
                value={formData.additionalIncome_p1 || ''}
                onChange={(e) => handleInputChange('additionalIncome_p1', e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditHistory_p1">Имеются ли действующие кредиты/рассрочки? Где? Суммы платежей? А до этого были? (П1)</Label>
              <Textarea
                id="creditHistory_p1"
                value={formData.creditHistory_p1 || ''}
                onChange={(e) => handleInputChange('creditHistory_p1', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collateralInfo_p1">Есть ли имущество, чтобы при необходимости использовать в качестве залога? (П1)</Label>
              <Textarea
                id="collateralInfo_p1"
                value={formData.collateralInfo_p1 || ''}
                onChange={(e) => handleInputChange('collateralInfo_p1', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="housingInfo_p1">Имеется ли собственное жилье? Или съемное, или с родителями? (П1)</Label>
              <Textarea
                id="housingInfo_p1"
                value={formData.housingInfo_p1 || ''}
                onChange={(e) => handleInputChange('housingInfo_p1', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isNewClient_p1">Клиент новый? Если нет, то какая оценка клиента в базе Эснад? (П1)</Label>
              <Textarea
                id="isNewClient_p1"
                value={formData.isNewClient_p1 || ''}
                onChange={(e) => handleInputChange('isNewClient_p1', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="psychologicalAssessment_p1">Психологическая оценка клиента (подробный текст) (П1)</Label>
              <Textarea
                id="psychologicalAssessment_p1"
                value={formData.psychologicalAssessment_p1 || ''}
                onChange={(e) => handleInputChange('psychologicalAssessment_p1', e.target.value)}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalPhoneNumber_p1">Имеется ли доп. номер (П1)</Label>
              <Input
                id="additionalPhoneNumber_p1"
                type="tel"
                value={formData.additionalPhoneNumber_p1 || ''}
                onChange={(e) => handleInputChange('additionalPhoneNumber_p1', e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
          </div>
        )
      case 'guarantor2':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Информация о втором поручителе</p>
            <div className="space-y-2">
              <Label htmlFor="fsspInfo_p2">Информация из ФССП, и других баз. 3 (П2)</Label>
              <Textarea
                id="fsspInfo_p2"
                value={formData.fsspInfo_p2 || ''}
                onChange={(e) => handleInputChange('fsspInfo_p2', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="getcontactInfo_p2">Информация из Гетконтакт (П2)</Label>
              <Textarea
                id="getcontactInfo_p2"
                value={formData.getcontactInfo_p2 || ''}
                onChange={(e) => handleInputChange('getcontactInfo_p2', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName_p2">ФИО поручителя 2 (П2)</Label>
              <Input
                id="fullName_p2"
                value={formData.fullName_p2 || ''}
                onChange={(e) => handleInputChange('fullName_p2', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passportPhoto_p2">Фото паспорта (П2)</Label>
              <Input
                id="passportPhoto_p2"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  handleInputChange('passportPhoto_p2', files as File[])
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber_p2">Номер телефона поручителя 2 (П2)</Label>
              <Input
                id="phoneNumber_p2"
                type="tel"
                value={formData.phoneNumber_p2 || ''}
                onChange={(e) => handleInputChange('phoneNumber_p2', e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship_p2">Кем приходится клиенту? (П2)</Label>
              <Input
                id="relationship_p2"
                value={formData.relationship_p2 || ''}
                onChange={(e) => handleInputChange('relationship_p2', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_p2">Фактическое место жительства 2 (П2)</Label>
              <Textarea
                id="address_p2"
                value={formData.address_p2 || ''}
                onChange={(e) => handleInputChange('address_p2', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentIncome_p2">Офиц. трудоустройство и суммы доходов отдельно (П2) *</Label>
              <Textarea
                id="employmentIncome_p2"
                value={formData.employmentIncome_p2 || ''}
                onChange={(e) => handleInputChange('employmentIncome_p2', e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus_p2">Семейное положение 2 (П2)</Label>
              <Input
                id="maritalStatus_p2"
                value={formData.maritalStatus_p2 || ''}
                onChange={(e) => handleInputChange('maritalStatus_p2', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="childrenInfo_p2">Дети, количество, их возраст (П2)</Label>
              <Textarea
                id="childrenInfo_p2"
                value={formData.childrenInfo_p2 || ''}
                onChange={(e) => handleInputChange('childrenInfo_p2', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditHistory_p2">Имеются ли действующие кредиты,рассрочки? Где? суммы платежей? А до этого были? (П2)</Label>
              <Textarea
                id="creditHistory_p2"
                value={formData.creditHistory_p2 || ''}
                onChange={(e) => handleInputChange('creditHistory_p2', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalIncome_p2">Пенсии, выплаты, другие доп. доходы (П2)</Label>
              <Textarea
                id="additionalIncome_p2"
                value={formData.additionalIncome_p2 || ''}
                onChange={(e) => handleInputChange('additionalIncome_p2', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relativesContact_p2">Номер родителей, брата (П2)</Label>
              <Input
                id="relativesContact_p2"
                type="tel"
                value={formData.relativesContact_p2 || ''}
                onChange={(e) => handleInputChange('relativesContact_p2', e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isNewClient_p2">Клиент новый? Если нет, то какая оценка в нашей базе? (П2)</Label>
              <Textarea
                id="isNewClient_p2"
                value={formData.isNewClient_p2 || ''}
                onChange={(e) => handleInputChange('isNewClient_p2', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="psychologicalAssessment_p2">Психологическая оценка и другое описание (П2)</Label>
              <Textarea
                id="psychologicalAssessment_p2"
                value={formData.psychologicalAssessment_p2 || ''}
                onChange={(e) => handleInputChange('psychologicalAssessment_p2', e.target.value)}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalPhoneNumber_p2">Имеется ли доп. номер? (П2)</Label>
              <Input
                id="additionalPhoneNumber_p2"
                type="tel"
                value={formData.additionalPhoneNumber_p2 || ''}
                onChange={(e) => handleInputChange('additionalPhoneNumber_p2', e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
          </div>
        )
      case 'finalDocs':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contractDocuments">ДКП и другие документы</Label>
              <Input
                id="contractDocuments"
                type="file"
                multiple
                className="bg-background"
                accept=".pdf,.doc,.docx,image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  handleInputChange('contractDocuments', files as File[])
                }}
              />
            </div>
          </div>
        )
      case 'guarantor':
        return renderGuarantor()
      case 'consent':
        return renderConsent()
      default:
        return null
    }
  }

  const handleAddGuarantor = async () => {
    const fullName = (formData.guarantorFullName || '').trim()
    const phone = (formData.guarantorPhone || '').trim()
    const relationship = formData.guarantorRelationship?.trim() || undefined
    const income = formData.guarantorIncome?.trim() || undefined

    if (!fullName || !phone) {
      setError('Необходимо заполнить ФИО и телефон поручителя')
      return
    }

    // For edit mode, immediately persist via API
    if (submitMethod === 'PUT' || submitMethod === 'PATCH') {
      try {
        setAddingGuarantor(true)
        const response = await fetch('/api/altrp/v1/c/guarantors', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            phone,
            relationship: formData.guarantorRelationship?.trim() || undefined,
            income: formData.guarantorIncome?.trim() || undefined,
          }),
        })

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string }
          throw new Error(data?.error || 'Не удалось добавить поручителя')
        }

        const data = (await response.json()) as {
          success?: boolean
          guarantor?: { haid: string; fullName?: string; dataIn?: { phone?: string } }
        }

        if (!data.success || !data.guarantor?.haid) {
          throw new Error('Не удалось добавить поручителя')
        }

        const newGuarantor = {
          haid: data.guarantor.haid,
          fullName: data.guarantor.fullName || fullName,
          phone: data.guarantor.dataIn?.phone || phone,
          relationship,
          income,
        }

        setExistingGuarantors((prev) => {
          const withoutDup = prev.filter((g) => g.haid !== newGuarantor.haid)
          return [...withoutDup, newGuarantor]
        })

        // Keep relation data to send on submit
        setNewGuarantors((prev) => {
          const withoutDup = prev.filter((g) => g.haid !== newGuarantor.haid && g.id !== newGuarantor.haid)
          return [
            ...withoutDup,
            {
              id: newGuarantor.haid ?? `temp-${Date.now()}`,
              haid: newGuarantor.haid,
              fullName: newGuarantor.fullName,
              phone: newGuarantor.phone,
              relationship,
              income,
            },
          ]
        })

        const selected = formData.selectedGuarantors || []
        if (!selected.includes(newGuarantor.haid)) {
          handleInputChange('selectedGuarantors', [...selected, newGuarantor.haid])
        }

        // Clear form fields
        handleInputChange('guarantorFullName', '')
        handleInputChange('guarantorPhone', '')
        handleInputChange('guarantorRelationship', '')
        handleInputChange('guarantorIncome', '')
        setError(null)
      } catch (err) {
        console.error('Add guarantor error:', err)
        setError(err instanceof Error ? err.message : 'Не удалось добавить поручителя')
      } finally {
        setAddingGuarantor(false)
      }
      return
    }

    const newGuarantor: NewGuarantor = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fullName,
      phone,
      relationship,
      income,
    }

    setNewGuarantors((prev) => [...prev, newGuarantor])

    // Clear form fields
    handleInputChange('guarantorFullName', '')
    handleInputChange('guarantorPhone', '')
    handleInputChange('guarantorRelationship', '')
    handleInputChange('guarantorIncome', '')
    setError(null)
  }

  const handleRemoveGuarantor = (id: string) => {
    setNewGuarantors((prev) => prev.filter((g) => g.id !== id))
  }

  const renderGuarantor = () => {
    const selectedGuarantors = formData.selectedGuarantors || []
    
    const handleGuarantorToggle = (haid: string) => {
      const current = selectedGuarantors
      if (current.includes(haid)) {
        handleInputChange('selectedGuarantors', current.filter((id) => id !== haid))
      } else {
        handleInputChange('selectedGuarantors', [...current, haid])
      }
    }

    return (
      <div className="space-y-6">
        {/* Multiple selection of existing guarantors */}
        {submitMethod === 'PUT' || submitMethod === 'PATCH' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Выберите существующих поручителей</Label>
              <p className="text-sm text-muted-foreground">
                Вы можете выбрать одного или нескольких поручителей из ваших предыдущих заявок
              </p>
              {loadingGuarantors ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Загрузка поручителей...</span>
                </div>
              ) : existingGuarantors.length > 0 ? (
                <div className="space-y-2 border rounded-lg p-4">
                  {existingGuarantors.map((guarantor) => (
                    <div key={guarantor.haid} className="flex items-center space-x-2">
                      <Checkbox
                        id={`guarantor-${guarantor.haid}`}
                        checked={selectedGuarantors.includes(guarantor.haid)}
                        onCheckedChange={() => handleGuarantorToggle(guarantor.haid)}
                      />
                      <Label
                        htmlFor={`guarantor-${guarantor.haid}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{guarantor.fullName}</span>
                          {guarantor.phone && (
                            <span className="text-sm text-muted-foreground">{guarantor.phone}</span>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Нет доступных поручителей из предыдущих заявок</p>
              )}
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-4">Или добавьте нового поручителя</p>
            </div>
          </div>
        ) : null}

        {/* List of added new guarantors */}
        {newGuarantors.length > 0 && (
          <div className="space-y-2">
            <Label>Добавленные поручители</Label>
            <div className="space-y-2 border rounded-lg p-4">
              {newGuarantors.map((guarantor) => (
                <div
                  key={guarantor.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{guarantor.fullName}</div>
                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                      <div>Телефон: {guarantor.phone}</div>
                      {guarantor.relationship && <div>Отношение: {guarantor.relationship}</div>}
                      {guarantor.income && <div>Доход: {guarantor.income}</div>}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveGuarantor(guarantor.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New guarantor form */}
        <div className="space-y-4 border rounded-lg p-4">
          <div className="space-y-2">
            <Label htmlFor="guarantorFullName">ФИО поручителя</Label>
            <Input
              id="guarantorFullName"
              value={formData.guarantorFullName || ''}
              onChange={(e) => handleInputChange('guarantorFullName', e.target.value)}
              placeholder="Иванов Иван Иванович"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guarantorPhone">Телефон поручителя</Label>
            <PhoneInput
              defaultCountry="RU"
              placeholder="+7 (999) 999-99-99"
              value={(formData.guarantorPhone?.trim() || undefined) as E164Number}
              onChange={(value) => {
                // PhoneInput returns E164 format directly, save it as is
                handleInputChange('guarantorPhone', value ?? '')
              }}
              hideCountrySelector
              className="!bg-muted"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guarantorRelationship">Отношение к заемщику</Label>
              <Input
                id="guarantorRelationship"
                value={formData.guarantorRelationship || ''}
                onChange={(e) => handleInputChange('guarantorRelationship', e.target.value)}
                placeholder="Например: супруг, родственник, коллега"
                className="bg-background "
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guarantorIncome">Доход поручителя</Label>
              <Input
                id="guarantorIncome"
                type="text"
                inputMode="numeric"
                value={formData.guarantorIncome || ''}
                onChange={(e) => handleInputChange('guarantorIncome', e.target.value)}
                placeholder="Например: 50 000"
                className="bg-background "
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleAddGuarantor}
            disabled={addingGuarantor}
            className="w-full"
          >
            {addingGuarantor ? 'Сохранение...' : 'Добавить поручителя'}
          </Button>
        </div>
      </div>
    )
  }

  // Step 6: Consent
  const renderConsent = () => (
    <div className="space-y-4">
      <div className="flex items-start space-x-3">
        <Checkbox
          id="consent"
          checked={formData.consentToProcessData || false}
          onCheckedChange={(checked) =>
            handleInputChange('consentToProcessData', checked)
          }
        />
        <Label
          htmlFor="consent"
          className="text-sm leading-relaxed cursor-pointer">
          Нажимая кнопку «Отправить», я даю свое согласие на обработку моих персональных
          данных, в соответствии с Федеральным законом от 27.07.2006 года №152-ФЗ «О
          персональных данных», на условиях и для целей, определенных в Согласии на обработку
          персональных данных *
        </Label>
      </div>
    </div>
  )

  // Updated renderSection for client steps (simplified)
  const renderStepContent = (stepId: string) => {
    if (isClient) {
      switch (stepId) {
        case 'contacts':
          return renderContacts()
        case 'productInfo':
          return renderProductInfo()
        case 'guarantor':
          return renderGuarantor()
        case 'consent':
          return renderConsent()
        // Keep old step IDs for backward compatibility if needed
        case 'personalInfo':
          return renderPersonalInfo()
        case 'financialInfo':
          return renderFinancialInfo()
        case 'passportInfo':
          return renderPassportInfo()
        case 'addresses':
          return renderAddresses()
        default:
          return null
      }
    }
    // For admin/staff, use old renderSection
    return renderSection(stepId)
  }

  const isLastStep = currentStep === sections.length - 1
  const isFirstStep = currentStep === 0
  const currentStepErrors = stepErrors[currentStep] || []
  // Check validation in real-time, not just stored errors
  const realTimeErrors = validateStep(currentStep)
  const canProceed = realTimeErrors.length === 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Вы уже заполнили {progress}%</span>
          <span className="text-muted-foreground">
            Шаг {currentStep + 1} из {sections.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps - Show only active step for clients */}
      <div className="space-y-4">
        {!sections.length ? (
          <div className="text-center p-4 text-muted-foreground">
            Нет доступных шагов для заполнения
          </div>
        ) : isClient ? (
          // For clients: show only active step
          (() => {
            const section = sections[currentStep]
            const stepErrorsForThisStep = stepErrors[currentStep] || []
            const sectionContent = renderStepContent(section.id)
            const isConsentStep = section.id === 'consent'
            const shouldShowErrors = isConsentStep ? submitAttempted && stepErrorsForThisStep.length > 0 : stepErrorsForThisStep.length > 0
            
            return (
              <Card
                key={section.id}
                id={`step-${currentStep}`}
                className="transition-all scroll-mt-4 border-2 border-primary bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm bg-primary/10 text-primary">
                          {currentStep + 1}
                        </span>
                        {section.title}
                      </CardTitle>
                      <CardDescription className="mt-1">{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {shouldShowErrors && (
                    <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                      <p className="text-sm font-medium text-destructive mb-1">Ошибки заполнения:</p>
                      <ul className="list-disc list-inside text-sm text-destructive space-y-1">
                        {stepErrorsForThisStep.map((error, errorIndex) => (
                          <li key={errorIndex}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {sectionContent}
                </CardContent>
              </Card>
            )
          })()
        ) : (
          // For admin/staff: show only active step
          (() => {
            const section = sections[currentStep]
            if (!section) return null
            
            const stepErrorsForThisStep = stepErrors[currentStep] || []
            const sectionContent = renderSection(section.id)
            const isConsentStep = section.id === 'consent'
            const shouldShowErrors = isConsentStep ? submitAttempted && stepErrorsForThisStep.length > 0 : stepErrorsForThisStep.length > 0
            
            return (
              <Card
                key={section.id}
                id={`step-${currentStep}`}
                className="transition-all scroll-mt-4 border-2 border-primary bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm bg-primary/10 text-primary">
                          {currentStep + 1}
                        </span>
                        {section.title}
                      </CardTitle>
                      <CardDescription className="mt-1">{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {shouldShowErrors && (
                    <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                      <p className="text-sm font-medium text-destructive mb-1">Ошибки заполнения:</p>
                      <ul className="list-disc list-inside text-sm text-destructive space-y-1">
                        {stepErrorsForThisStep.map((error, errorIndex) => (
                          <li key={errorIndex}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {sectionContent}
                </CardContent>
              </Card>
            )
          })()
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={isFirstStep || submitting}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        
        {isLastStep ? (
          <Button type="submit" disabled={submitting || !canProceed}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отправка...
              </>
            ) : (
              'Отправить заявку'
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={nextStep}
            disabled={!canProceed || submitting}>
            Далее
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  )
}



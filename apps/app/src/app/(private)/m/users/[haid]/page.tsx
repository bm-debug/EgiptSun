'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown, Loader2, Save, ArrowLeft, FileText, ExternalLink, CheckCircle, Clock, XCircle, User, Wallet, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Role {
  uuid: string
  title: string | null
  name: string | null
  description: string | null
  isSystem: boolean | null
}

interface User {
  uuid: string
  email: string
  isActive: boolean
  emailVerifiedAt: string | null
  createdAt: string
  updatedAt: string
  humanAid?: string | null
  roles?: Role[]
  human?: {
    haid?: string
    fullName: string | null
    dataIn?: any & {
      avatarMedia?: {
        uuid?: string
        url?: string
        fileName?: string
      }
      kycStatus?: string
      lastSelfieVerification?: {
        verified?: boolean
        faceMatchConfidence?: number
        error?: string
        highRisk?: boolean
        reasonCodes?: string[]
      }
      monthlyIncome?: string | number
      monthlyExpenses?: string | number
      workPlace?: string
      workExperience?: string
    }
    birthday?: string | null
    sex?: string | null
    email?: string | null
  }
}

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const uuid = (params?.haid || params?.uuid) as string

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)


  const [user, setUser] = React.useState<User | null>(null)
  const [roles, setRoles] = React.useState<Role[]>([])
  const [kycUpdating, setKycUpdating] = React.useState(false)

  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    isActive: true,
    emailVerified: false,
    roleUuids: [] as string[],
    monthlyIncome: '',
    monthlyExpenses: '',
    workPlace: '',
    workExperience: '',
  })

  const [ocrFormData, setOcrFormData] = React.useState({
    lastName: '',
    firstName: '',
    middleName: '',
    birthday: '',
    sex: '',
    placeOfBirth: '',
    registrationAddress: '',
    passportSeries: '',
    passportNumber: '',
    passportIssueDate: '',
    passportIssuedBy: '',
    passportDivisionCode: '',
    citizenship: '',
  })
  const [ocrFirstNameError, setOcrFirstNameError] = React.useState<string | null>(null)
  const [ocrLastNameError, setOcrLastNameError] = React.useState<string | null>(null)
  const [ocrMiddleNameError, setOcrMiddleNameError] = React.useState<string | null>(null)

  const [ocrSaving, setOcrSaving] = React.useState(false)
  const [ocrError, setOcrError] = React.useState<string | null>(null)
  const [ocrSuccess, setOcrSuccess] = React.useState(false)

  const [rolePopoverOpen, setRolePopoverOpen] = React.useState(false)

  React.useEffect(() => {
    if (uuid) {
      fetchUser()
      fetchRoles()
    } else {
      setLoading(false)
      setError('UUID пользователя не указан')
    }
  }, [uuid])

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/altrp/v1/admin/users/${uuid}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string }
        throw new Error(errorData.message || errorData.error || 'Failed to fetch user')
      }

      const data = await response.json() as { success?: boolean; user?: User; error?: string; message?: string }
      if (data.success && data.user) {
        setUser(data.user)
        let dataIn: any = {}
        if (data.user.human?.dataIn) {
          try {
            dataIn =
              typeof data.user.human.dataIn === 'string'
                ? JSON.parse(data.user.human.dataIn)
                : data.user.human.dataIn
          } catch (e) {
            console.error('Failed to parse human.dataIn on admin user edit page:', e)
          }
        }
        // Parse name from fullName or use separate fields if available
        let lastName = ''
        let firstName = ''
        let middleName = ''
        
        if (dataIn.lastName && dataIn.firstName) {
          // Use separate fields if available
          lastName = dataIn.lastName
          firstName = dataIn.firstName
          middleName = dataIn.middleName || ''
        } else if (data.user.human?.fullName) {
          // Parse fullName into parts
          const nameParts = data.user.human.fullName.trim().split(/\s+/)
          if (nameParts.length >= 2) {
            lastName = nameParts[0] || ''
            firstName = nameParts[1] || ''
            middleName = nameParts.slice(2).join(' ') || ''
          } else if (nameParts.length === 1) {
            firstName = nameParts[0] || ''
          }
        }
        
        setFormData({
          email: data.user.email || '',
          password: '',
          isActive: data.user.isActive ?? true,
          emailVerified: !!data.user.emailVerifiedAt,
          roleUuids: data.user.roles?.map((r: Role) => r.uuid) || [],
          monthlyIncome: dataIn.monthlyIncome ? String(dataIn.monthlyIncome) : '',
          monthlyExpenses: dataIn.monthlyExpenses ? String(dataIn.monthlyExpenses) : '',
          workPlace: dataIn.workPlace || '',
          workExperience: dataIn.workExperience || '',
        })

        // Initialize OCR form data from human and dataIn
        // Use separate name fields
        setOcrFormData({
          lastName: dataIn.lastName || lastName || '',
          firstName: dataIn.firstName || firstName || '',
          middleName: dataIn.middleName || middleName || '',
          birthday: data.user.human?.birthday || '',
          sex: data.user.human?.sex || '',
          placeOfBirth: dataIn.placeOfBirth || '',
          registrationAddress: dataIn.registrationAddress || '',
          passportSeries: dataIn.passportSeries || '',
          passportNumber: dataIn.passportNumber || '',
          passportIssueDate: dataIn.passportIssueDate || '',
          passportIssuedBy: dataIn.passportIssuedBy || '',
          passportDivisionCode: dataIn.passportDivisionCode || '',
          citizenship: dataIn.citizenship || '',
        })
      } else {
        throw new Error(data.message || 'User not found')
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/altrp/v1/admin/roles', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch roles')
      }

      const data = await response.json() as { docs?: Role[]; success?: boolean; roles?: Role[] }
      // API returns { docs: Role[] } format
      if (Array.isArray(data.docs)) {
        setRoles(data.docs)
      } else if (data.success && Array.isArray(data.roles)) {
        // Fallback for alternative format
        setRoles(data.roles)
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err)
    }
  }

  // Validate Cyrillic characters
  const cyrillicRegex = /^[А-Яа-яЁё\s-]*$/

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

  // Handle OCR first name change with validation
  const handleOcrFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setOcrFormData((prev) => ({ ...prev, firstName: value }))
    
    if (value && !cyrillicRegex.test(value)) {
      setOcrFirstNameError("Имя должно содержать только кириллические символы")
    } else {
      setOcrFirstNameError(null)
    }
  }

  // Handle OCR last name change with validation
  const handleOcrLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setOcrFormData((prev) => ({ ...prev, lastName: value }))
    
    if (value && !cyrillicRegex.test(value)) {
      setOcrLastNameError("Фамилия должна содержать только кириллические символы")
    } else {
      setOcrLastNameError(null)
    }
  }

  // Handle OCR middle name change with validation
  const handleOcrMiddleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setOcrFormData((prev) => ({ ...prev, middleName: value }))
    
    if (value && !cyrillicRegex.test(value)) {
      setOcrMiddleNameError("Отчество должно содержать только кириллические символы")
    } else {
      setOcrMiddleNameError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const updateData: any = {
        email: formData.email.trim(),
        isActive: formData.isActive,
        emailVerified: formData.emailVerified,
        roleUuids: formData.roleUuids,
      }

      // Only include password if it's not empty
      if (formData.password.trim() !== '') {
        updateData.password = formData.password
      }

      // Financial info from admin (stored in human.dataIn)
      if (formData.monthlyIncome.trim() !== '') {
        updateData.monthlyIncome = formData.monthlyIncome.trim()
      }
      if (formData.monthlyExpenses.trim() !== '') {
        updateData.monthlyExpenses = formData.monthlyExpenses.trim()
      }
      if (formData.workPlace.trim() !== '') {
        updateData.workPlace = formData.workPlace.trim()
      }
      if (formData.workExperience.trim() !== '') {
        updateData.workExperience = formData.workExperience.trim()
      }

      const response = await fetch(`/api/altrp/v1/admin/users/${uuid}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string }
        const errorMessage = errorData.message || errorData.error || 'Failed to update user'
        throw new Error(errorMessage)
      }

      const data = await response.json() as { success?: boolean; user?: User; message?: string }
      if (data.success) {
        setSuccess(true)
        if (data.user) {
          setUser(data.user)
        }
        // Clear password field after successful save
        setFormData((prev) => ({ ...prev, password: '' }))
        // Redirect after 1 second
        setTimeout(() => {
          router.push('/m/users')
        }, 1000)
      } else {
        throw new Error(data.message || 'Failed to update user')
      }
    } catch (err) {
      console.error('Failed to update user:', err)
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const selectedRoles = roles.filter((role) => formData.roleUuids.includes(role.uuid))

  const handleOcrSave = async () => {
    if (!user) return
    
    try {
      setOcrSaving(true)
      setOcrError(null)
      setOcrSuccess(false)

      const updateData: any = {}
      
      // Include all fields (allow empty values to clear fields)
      // Compute fullName from separate fields
      const computedFullName = [ocrFormData.lastName, ocrFormData.firstName, ocrFormData.middleName].filter(Boolean).join(' ') || null
      if (computedFullName !== null) updateData.fullName = computedFullName
      if (ocrFormData.lastName !== undefined) updateData.lastName = ocrFormData.lastName.trim() || null
      if (ocrFormData.firstName !== undefined) updateData.firstName = ocrFormData.firstName.trim() || null
      if (ocrFormData.middleName !== undefined) updateData.middleName = ocrFormData.middleName.trim() || null
      if (ocrFormData.birthday !== undefined) updateData.birthday = ocrFormData.birthday.trim() || null
      if (ocrFormData.sex !== undefined) updateData.sex = ocrFormData.sex.trim() || null
      if (ocrFormData.placeOfBirth !== undefined) updateData.placeOfBirth = ocrFormData.placeOfBirth.trim() || null
      if (ocrFormData.registrationAddress !== undefined) updateData.registrationAddress = ocrFormData.registrationAddress.trim() || null
      if (ocrFormData.passportSeries !== undefined) updateData.passportSeries = ocrFormData.passportSeries.trim() || null
      if (ocrFormData.passportNumber !== undefined) updateData.passportNumber = ocrFormData.passportNumber.trim() || null
      if (ocrFormData.passportIssueDate !== undefined) updateData.passportIssueDate = ocrFormData.passportIssueDate.trim() || null
      if (ocrFormData.passportIssuedBy !== undefined) updateData.passportIssuedBy = ocrFormData.passportIssuedBy.trim() || null
      if (ocrFormData.passportDivisionCode !== undefined) updateData.passportDivisionCode = ocrFormData.passportDivisionCode.trim() || null
      if (ocrFormData.citizenship !== undefined) updateData.citizenship = ocrFormData.citizenship.trim() || null

      const response = await fetch(`/api/altrp/v1/admin/users/${user.uuid}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string }
        throw new Error(errorData.message || errorData.error || 'Failed to update OCR data')
      }

      const data = await response.json() as { success?: boolean; user?: User; message?: string }
      if (data.success && data.user) {
        setUser(data.user)
        setOcrSuccess(true)
        setTimeout(() => setOcrSuccess(false), 3000)
        
        // Reload page data
        await fetchUser()
      } else {
        throw new Error(data.message || 'Failed to update OCR data')
      }
    } catch (err) {
      console.error('Failed to update OCR data:', err)
      setOcrError(err instanceof Error ? err.message : 'Failed to update OCR data')
    } finally {
      setOcrSaving(false)
    }
  }

  const handleOcrReset = () => {
    if (!user) return
    
    const dataIn = typeof user.human!.dataIn === 'string' 
      ? JSON.parse(user.human!.dataIn) 
      : user.human!.dataIn
    
    // Use separate name fields from dataIn
    setOcrFormData({
      lastName: dataIn.lastName || '',
      firstName: dataIn.firstName || '',
      middleName: dataIn.middleName || '',
      birthday: user.human?.birthday || '',
      sex: user.human?.sex || '',
      placeOfBirth: dataIn.placeOfBirth || '',
      registrationAddress: dataIn.registrationAddress || '',
      passportSeries: dataIn.passportSeries || '',
      passportNumber: dataIn.passportNumber || '',
      passportIssueDate: dataIn.passportIssueDate || '',
      passportIssuedBy: dataIn.passportIssuedBy || '',
      passportDivisionCode: dataIn.passportDivisionCode || '',
      citizenship: dataIn.citizenship || '',
    })
    setOcrError(null)
    setOcrSuccess(false)
    setOcrFirstNameError(null)
    setOcrLastNameError(null)
    setOcrMiddleNameError(null)
  }

  const handleKycStatusChange = async (status: 'verified' | 'pending' | 'rejected') => {
    if (!user) return
    try {
      setKycUpdating(true)
      const response = await fetch(`/api/altrp/v1/admin/users/${user.uuid}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kycStatus: status }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string; error?: string }
        throw new Error(errorData.message || errorData.error || 'Failed to update KYC status')
      }

      const data = await response.json() as { success?: boolean; user?: User; message?: string }
      if (data.success && data.user) {
        setUser(data.user)
      }
    } catch (err) {
      console.error('Failed to update KYC status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update KYC status')
    } finally {
      setKycUpdating(false)
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Редактировать пользователя" />
        <main className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    )
  }

  if (error && !user) {
    return (
      <>
        <AdminHeader title="Редактировать пользователя" />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Link href="/m/users">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Вернуться к списку пользователей
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Редактировать пользователя" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => {
                if(window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/m/users')
                }
              }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
            {user?.human?.haid && user?.emailVerifiedAt && (
              <Link href={`/m/users/${user.human.haid}/wallet`}>
                <Button variant="outline" size="sm">
                  <Wallet className="mr-2 h-4 w-4" />
                  Кошелек пользователя
                </Button>
              </Link>
            )}
          </div>

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                Пользователь успешно обновлен. Перенаправление...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Avatar and Verification Status */}
          {user?.human?.dataIn?.avatarMedia && (
            <Card>
              <CardHeader>
                <CardTitle>Аватар пользователя</CardTitle>
                <CardDescription>
                  Автоматически извлечен из селфи с паспортом
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  <Avatar className="h-32 w-32 border-2 shadow-md">
                    <AvatarImage 
                      src={`/api/altrp/v1/media/${user.human.dataIn.avatarMedia.uuid}`}
                      alt={user.human.fullName || user.email}
                    />
                    <AvatarFallback className="text-4xl">
                      <User className="h-16 w-16" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium">Статус верификации:</p>
                      <div className="mt-1">
                        {user.human.dataIn.kycStatus === 'verified' && (
                          <Badge className="bg-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Верифицирован
                          </Badge>
                        )}
                        {user.human.dataIn.kycStatus === 'pending' && (
                          <Badge variant="secondary">
                            <Clock className="mr-1 h-3 w-3" />
                            На проверке
                          </Badge>
                        )}
                        {(!user.human.dataIn.kycStatus || user.human.dataIn.kycStatus === 'not_started') && (
                          <Badge variant="outline">Не начата</Badge>
                        )}
                      </div>
                    </div>
                    {user.human.dataIn.lastSelfieVerification && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">Последняя верификация селфи:</p>
                          {user.human.dataIn.lastSelfieVerification.highRisk && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              High Risk
                            </Badge>
                          )}
                        </div>
                        <div className={`mt-1 text-sm space-y-1 ${user.human.dataIn.lastSelfieVerification.highRisk ? 'p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900' : ''}`}>
                          <div className="flex items-center gap-2">
                            {user.human.dataIn.lastSelfieVerification.verified ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span>
                              {user.human.dataIn.lastSelfieVerification.verified 
                                ? 'Пройдена' 
                                : 'Не пройдена'}
                            </span>
                          </div>
                          {user.human.dataIn.lastSelfieVerification.faceMatchConfidence !== undefined && (
                            <p>
                              Совпадение лиц: {Math.round(user.human.dataIn.lastSelfieVerification.faceMatchConfidence * 100)}%
                            </p>
                          )}
                          {user.human.dataIn.lastSelfieVerification.reasonCodes && user.human.dataIn.lastSelfieVerification.reasonCodes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">Коды причин:</p>
                              <div className="flex flex-wrap gap-1">
                                {user.human.dataIn.lastSelfieVerification.reasonCodes.map((code: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {code}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {user.human.dataIn.lastSelfieVerification.error && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertDescription className="text-xs">
                                <strong>Ошибка верификации:</strong> {user.human.dataIn.lastSelfieVerification.error}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Информация о пользователе</CardTitle>
              <CardDescription>
                Обновите данные пользователя. Оставьте пароль пустым, чтобы не изменять его.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="admin-user-edit-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="user@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Новый пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="Оставьте пустым, чтобы не изменять"
                  />
                  <p className="text-sm text-muted-foreground">
                    Оставьте поле пустым, если не хотите изменять пароль
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked === true }))
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Активен
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailVerified"
                    checked={formData.emailVerified}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, emailVerified: checked === true }))
                    }
                  />
                  <Label htmlFor="emailVerified" className="cursor-pointer">
                    Email подтвержден
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>Роли</Label>
                  <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                        aria-expanded={rolePopoverOpen}>
                        <span className="truncate">
                          {selectedRoles.length > 0
                            ? selectedRoles.length === 1
                              ? selectedRoles[0].title || selectedRoles[0].name || 'Роль'
                              : `Выбрано: ${selectedRoles.length}`
                            : 'Выберите роли...'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Поиск ролей..." />
                        <CommandList>
                          <CommandEmpty>Роли не найдены</CommandEmpty>
                          <CommandGroup>
                            {roles.map((role) => {
                              const isSelected = formData.roleUuids.includes(role.uuid)
                              const roleLabel = role.title || role.name || 'Роль'
                              return (
                                <CommandItem
                                  key={role.uuid}
                                  value={`${roleLabel} ${role.uuid}`}
                                  onSelect={() => {
                                    setFormData((prev) => {
                                      const newRoleUuids = isSelected
                                        ? prev.roleUuids.filter((id) => id !== role.uuid)
                                        : [...prev.roleUuids, role.uuid]
                                      return { ...prev, roleUuids: newRoleUuids }
                                    })
                                  }}>
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      isSelected ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {roleLabel}
                                  {role.isSystem && (
                                    <Badge variant="secondary" className="ml-2">
                                      Системная
                                    </Badge>
                                  )}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedRoles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRoles.map((role) => (
                        <Badge key={role.uuid} variant="secondary">
                          {role.title || role.name}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                roleUuids: prev.roleUuids.filter((id) => id !== role.uuid),
                              }))
                            }}
                            className="ml-2 hover:text-destructive">
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {user && (
                  <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                    <div>
                      <strong>UUID:</strong> {user.uuid}
                    </div>
                    <div>
                      <strong>Создан:</strong>{' '}
                      {new Date(user.createdAt).toLocaleString('ru-RU')}
                    </div>
                    <div>
                      <strong>Обновлен:</strong>{' '}
                      {new Date(user.updatedAt).toLocaleString('ru-RU')}
                    </div>
                    {user.emailVerifiedAt && (
                      <div>
                        <strong>Email подтвержден:</strong>{' '}
                        {new Date(user.emailVerifiedAt).toLocaleString('ru-RU')}
                      </div>
                    )}
                  </div>
                )}

                <div className="h-16" />
              </form>
            </CardContent>
          </Card>

          {/* OCR / Паспортные данные (правка админом) */}
          {user && user.human && (
            <Card>
              <CardHeader>
                <CardTitle>OCR / Паспортные данные (правка админом)</CardTitle>
                <CardDescription>
                  Редактирование распознанных данных и паспортных полей. Изменения сохраняются с пометкой источника "manual".
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ocrError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{ocrError}</AlertDescription>
                  </Alert>
                )}
                {ocrSuccess && (
                  <Alert className="mb-4 bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">
                      Данные успешно сохранены
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="ocr-lastName">Фамилия</Label>
                      <Input
                        id="ocr-lastName"
                        type="text"
                        placeholder="Иванов"
                        value={ocrFormData.lastName}
                        onChange={handleOcrLastNameChange}
                        className={ocrLastNameError ? "border-destructive" : ""}
                        aria-invalid={!!ocrLastNameError}
                        aria-describedby={ocrLastNameError ? "ocr-lastName-error" : undefined}
                      />
                      {ocrLastNameError && (
                        <p id="ocr-lastName-error" className="text-xs text-destructive">
                          {ocrLastNameError}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-firstName">Имя</Label>
                      <Input
                        id="ocr-firstName"
                        type="text"
                        placeholder="Иван"
                        value={ocrFormData.firstName}
                        onChange={handleOcrFirstNameChange}
                        className={ocrFirstNameError ? "border-destructive" : ""}
                        aria-invalid={!!ocrFirstNameError}
                        aria-describedby={ocrFirstNameError ? "ocr-firstName-error" : undefined}
                      />
                      {ocrFirstNameError && (
                        <p id="ocr-firstName-error" className="text-xs text-destructive">
                          {ocrFirstNameError}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-middleName">Отчество</Label>
                      <Input
                        id="ocr-middleName"
                        type="text"
                        placeholder="Иванович"
                        value={ocrFormData.middleName}
                        onChange={handleOcrMiddleNameChange}
                        className={ocrMiddleNameError ? "border-destructive" : ""}
                        aria-invalid={!!ocrMiddleNameError}
                        aria-describedby={ocrMiddleNameError ? "ocr-middleName-error" : undefined}
                      />
                      {ocrMiddleNameError && (
                        <p id="ocr-middleName-error" className="text-xs text-destructive">
                          {ocrMiddleNameError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ocr-birthday">Дата рождения</Label>
                      <Input
                        id="ocr-birthday"
                        type="date"
                        value={ocrFormData.birthday}
                        onChange={(e) => setOcrFormData((prev) => ({ ...prev, birthday: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-sex">Пол</Label>
                      <Select
                        value={ocrFormData.sex}
                        onValueChange={(value) => setOcrFormData((prev) => ({ ...prev, sex: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите пол" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Мужской</SelectItem>
                          <SelectItem value="F">Женский</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-placeOfBirth">Место рождения</Label>
                      <Input
                        id="ocr-placeOfBirth"
                        value={ocrFormData.placeOfBirth}
                        onChange={(e) => setOcrFormData((prev) => ({ ...prev, placeOfBirth: e.target.value }))}
                        placeholder="г. Москва"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-registrationAddress">Адрес регистрации</Label>
                      <Input
                        id="ocr-registrationAddress"
                        value={ocrFormData.registrationAddress}
                        onChange={(e) => setOcrFormData((prev) => ({ ...prev, registrationAddress: e.target.value }))}
                        placeholder="Полный адрес регистрации"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-citizenship">Гражданство</Label>
                      <Input
                        id="ocr-citizenship"
                        value={ocrFormData.citizenship}
                        onChange={(e) => setOcrFormData((prev) => ({ ...prev, citizenship: e.target.value }))}
                        placeholder="РФ"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-passportSeries">Серия паспорта</Label>
                      <Input
                        id="ocr-passportSeries"
                        value={ocrFormData.passportSeries}
                        onChange={(e) => setOcrFormData((prev) => ({ ...prev, passportSeries: e.target.value }))}
                        placeholder="1234"
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-passportNumber">Номер паспорта</Label>
                      <Input
                        id="ocr-passportNumber"
                        value={ocrFormData.passportNumber}
                        onChange={(e) => setOcrFormData((prev) => ({ ...prev, passportNumber: e.target.value }))}
                        placeholder="567890"
                        maxLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-passportIssueDate">Дата выдачи паспорта</Label>
                      <Input
                        id="ocr-passportIssueDate"
                        type="date"
                        value={ocrFormData.passportIssueDate}
                        onChange={(e) => setOcrFormData((prev) => ({ ...prev, passportIssueDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-passportIssuedBy">Кем выдан паспорт</Label>
                      <Input
                        id="ocr-passportIssuedBy"
                        value={ocrFormData.passportIssuedBy}
                        onChange={(e) => setOcrFormData((prev) => ({ ...prev, passportIssuedBy: e.target.value }))}
                        placeholder="Наименование органа"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ocr-passportDivisionCode">Код подразделения</Label>
                      <Input
                        id="ocr-passportDivisionCode"
                        value={ocrFormData.passportDivisionCode}
                        onChange={(e) => setOcrFormData((prev) => ({ ...prev, passportDivisionCode: formatDivisionCode(e.target.value) }))}
                        placeholder="123-456"
                        pattern="[0-9]{3}-[0-9]{3}"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      onClick={handleOcrSave}
                      disabled={ocrSaving}
                    >
                      {ocrSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Сохранить вручную
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOcrReset}
                      disabled={ocrSaving}
                    >
                      Сбросить правки
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Данные из заявки - временно скрыто
          {user && user.human?.dataIn && (
            <Card>
              <CardHeader>
                <CardTitle>Данные из заявки</CardTitle>
                <CardDescription>
                  Информация, заполненная пользователем при оформлении заявки
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const dataIn = typeof user.human!.dataIn === 'string' 
                      ? JSON.parse(user.human!.dataIn) 
                      : user.human!.dataIn
                    
                    const fields = [
                      { key: 'firstName', label: 'Имя' },
                      { key: 'lastName', label: 'Фамилия' },
                      { key: 'middleName', label: 'Отчество' },
                      { key: 'phone', label: 'Телефон' },
                      { key: 'dateOfBirth', label: 'Дата рождения' },
                      { key: 'placeOfBirth', label: 'Место рождения' },
                      { key: 'citizenship', label: 'Гражданство' },
                      { key: 'maritalStatus', label: 'Семейное положение' },
                      { key: 'numberOfChildren', label: 'Количество детей' },
                      { key: 'passportSeries', label: 'Серия паспорта' },
                      { key: 'passportNumber', label: 'Номер паспорта' },
                      { key: 'passportIssueDate', label: 'Дата выдачи паспорта' },
                      { key: 'passportIssuedBy', label: 'Кем выдан паспорт' },
                      { key: 'passportDivisionCode', label: 'Код подразделения' },
                      { key: 'inn', label: 'ИНН' },
                      { key: 'snils', label: 'СНИЛС' },
                      { key: 'permanentAddress', label: 'Постоянное место жительства' },
                      { key: 'registrationAddress', label: 'Адрес регистрации' },
                    ]

                    return (
                      <div className="grid gap-4 md:grid-cols-2">
                        {fields.map((field) => {
                          const value = dataIn[field.key]
                          if (!value) return null
                          return (
                            <div key={field.key} className="space-y-1">
                              <Label className="text-sm font-medium text-muted-foreground">
                                {field.label}
                              </Label>
                              <p className="text-sm">{String(value)}</p>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
          */}

          {/* KYC Документы */}
          {user && user.human?.dataIn && (() => {
            const dataIn = typeof user.human!.dataIn === 'string' 
              ? JSON.parse(user.human!.dataIn) 
              : user.human!.dataIn
            
            const kycDocuments = dataIn?.kycDocuments || []
            
            if (kycDocuments.length === 0) {
              return null
            }

            const getDocumentTypeLabel = (type: string) => {
              const typeMap: Record<string, string> = {
                'passport_registration': 'Паспорт (страница с регистрацией)',
                'selfie_with_passport': 'Селфи с паспортом',
                'selfie': 'Селфи',
                'other': 'Справка о доходах',
              }
              return typeMap[type] || type
            }

            const getStatusIcon = (status?: string) => {
              switch (status) {
                case 'verified':
                  return <CheckCircle className="h-4 w-4 text-green-600" />
                case 'pending':
                  return <Clock className="h-4 w-4 text-yellow-600" />
                case 'rejected':
                  return <XCircle className="h-4 w-4 text-red-600" />
                default:
                  return <Clock className="h-4 w-4 text-gray-400" />
              }
            }

            const getStatusLabel = (status?: string) => {
              switch (status) {
                case 'verified':
                  return 'Верифицирован'
                case 'pending':
                  return 'На проверке'
                case 'rejected':
                  return 'Отклонен'
                default:
                  return 'Ожидает проверки'
              }
            }

            return (
              <Card>
                <CardHeader>
                  <CardTitle>KYC Документы</CardTitle>
                  <CardDescription>
                    Документы, загруженные пользователем для верификации
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {kycDocuments.map((doc: any, index: number) => {
                        const fileUrl = `/api/altrp/v1/admin/files/${doc.mediaUuid}`
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{getDocumentTypeLabel(doc.type)}</span>
                                  {getStatusIcon(doc.status)}
                                  <Badge variant="outline" className="text-xs">
                                    {getStatusLabel(doc.status)}
                                  </Badge>
                                </div>
                                {doc.uploadedAt && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Загружен: {new Date(doc.uploadedAt).toLocaleString('ru-RU')}
                                  </p>
                                )}
                                {doc.type === 'selfie_with_passport' && doc.verificationResult && (() => {
                                  try {
                                    const verificationDetails = typeof doc.verificationResult.details === 'string'
                                      ? JSON.parse(doc.verificationResult.details)
                                      : doc.verificationResult.details
                                    
                                    const isHighRisk = verificationDetails.highRisk === true
                                    const reasonCodes = verificationDetails.reasonCodes || []
                                    
                                    // Function to translate reason codes to human-readable text
                                    const getReasonCodeText = (code: string): string => {
                                      const codeMap: Record<string, string> = {
                                        'NO_FACES': 'Лица не обнаружены на фото',
                                        'TOO_FEW_FACES': 'Обнаружено только одно лицо. На фото должно быть видно ваше лицо и лицо в паспорте',
                                        'TOO_MANY_FACES': 'Обнаружено слишком много лиц. На фото должно быть только ваше лицо и лицо в паспорте',
                                        'FACE_MISMATCH': 'Лица на фото не совпадают',
                                        'PASSPORT_NOT_READABLE': 'Не удалось распознать паспорт на фото. Убедитесь, что паспорт четко виден и читаем',
                                        'NO_FACE_IN_PASSPORT': 'Лицо в паспорте не обнаружено',
                                        'NAME_MISMATCH': 'Имена не совпадают',
                                        'LOW_CONFIDENCE': 'Низкая уверенность в верификации',
                                        'POSSIBLE_FOREIGN_PASSPORT': 'Возможно, зарубежный паспорт',
                                      }
                                      return codeMap[code] || code
                                    }
                                    
                                    // Remove duplicates using Set
                                    const uniqueReasonCodes = Array.from(new Set(reasonCodes as string[]))
                                    
                                    return (
                                      <div className={`mt-2 space-y-2 ${isHighRisk ? 'p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900' : ''}`}>
                                        {isHighRisk && (
                                          <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="destructive" className="text-xs">
                                              <AlertTriangle className="h-3 w-3 mr-1" />
                                              High Risk
                                            </Badge>
                                          </div>
                                        )}
                                        
                                        {verificationDetails?.error && (
                                          <Alert variant="destructive">
                                            <AlertDescription className="text-xs">
                                              <strong>Ошибка верификации:</strong> {verificationDetails.error}
                                            </AlertDescription>
                                          </Alert>
                                        )}
                                        
                                        {uniqueReasonCodes.length > 0 && (
                                          <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">Причины отклонения:</p>
                                            <div className="space-y-1">
                                              {uniqueReasonCodes.map((code, idx) => (
                                                <p key={idx} className="text-xs text-muted-foreground">• {getReasonCodeText(code)}</p>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {verificationDetails?.reasons && Array.isArray(verificationDetails.reasons) && verificationDetails.reasons.length > 0 && (
                                          <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">Причины:</p>
                                            {verificationDetails.reasons.map((reason: string, idx: number) => (
                                              <p key={idx} className="text-xs text-muted-foreground">• {reason}</p>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {verificationDetails?.passportRawText && (
                                          <div className="mt-2 p-2 bg-muted rounded-md">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Распознанный текст с паспорта:</p>
                                            <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-mono">
                                              {verificationDetails.passportRawText}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  } catch (e) {
                                    // Ignore parsing errors
                                    return null
                                  }
                                })()}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const width = 1200
                                const height = 800
                                const left = (window.screen.width - width) / 2
                                const top = (window.screen.height - height) / 2
                                window.open(
                                  fileUrl,
                                  '_blank',
                                  `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
                                )
                              }}
                              className="flex items-center gap-2">
                              <span className="text-sm">Открыть</span>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                    {dataIn?.kycStatus && (
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Статус верификации:</span>
                          <Badge variant={
                            dataIn.kycStatus === 'verified' ? 'default' :
                            dataIn.kycStatus === 'rejected' ? 'destructive' :
                            'secondary'
                          }>
                            {dataIn.kycStatus === 'verified' && <CheckCircle className="mr-1 h-3 w-3" />}
                            {dataIn.kycStatus === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                            {dataIn.kycStatus === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                            {getStatusLabel(dataIn.kycStatus)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={kycUpdating || dataIn.kycStatus === 'pending'}
                            onClick={() => handleKycStatusChange('pending')}
                          >
                            {kycUpdating && dataIn.kycStatus === 'pending'
                              ? <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              : null}
                            На проверке
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={kycUpdating || dataIn.kycStatus === 'verified'}
                            onClick={() => handleKycStatusChange('verified')}
                          >
                            {kycUpdating && dataIn.kycStatus === 'verified'
                              ? <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              : null}
                            Подтвердить KYC
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={kycUpdating || dataIn.kycStatus === 'rejected'}
                            onClick={() => handleKycStatusChange('rejected')}
                          >
                            {kycUpdating && dataIn.kycStatus === 'rejected'
                              ? <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              : null}
                            Отклонить KYC
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Финансовая информация (заполняется админом по справке о доходах) */}
                    <div className="pt-4 border-t space-y-4">
                      <div>
                        <p className="text-sm font-medium">Финансовая информация</p>
                        <p className="text-xs text-muted-foreground">
                          Данные из справки о доходах, которые админ вносит вручную
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="monthlyIncome">Доход в месяц (руб.)</Label>
                          <Input
                            id="monthlyIncome"
                            type="number"
                            inputMode="decimal"
                            value={formData.monthlyIncome}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, monthlyIncome: e.target.value }))
                            }
                            placeholder="Например, 75000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="monthlyExpenses">Расходы в месяц (руб.)</Label>
                          <Input
                            id="monthlyExpenses"
                            type="number"
                            inputMode="decimal"
                            value={formData.monthlyExpenses}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, monthlyExpenses: e.target.value }))
                            }
                            placeholder="Например, 30000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workPlace">Место работы</Label>
                          <Input
                            id="workPlace"
                            type="text"
                            value={formData.workPlace}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, workPlace: e.target.value }))
                            }
                            placeholder="ООО Ромашка"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workExperience">Стаж работы</Label>
                          <Input
                            id="workExperience"
                            type="text"
                            value={formData.workExperience}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, workExperience: e.target.value }))
                            }
                            placeholder="Например, 3 года"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })()}
        </div>
      </main>
      <div className="sticky bottom-0 border-t bg-background/80 backdrop-blur-sm">
        <div className="p-4 flex gap-2 justify-end">
          <Button type="submit" form="admin-user-edit-form" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить изменения
              </>
            )}
          </Button>
          <Link href="/m/users">
            <Button type="button" variant="outline">
              Отмена
            </Button>
          </Link>
        </div>
      </div>
    </>
  )
}


'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Info, Upload, CheckCircle, XCircle, Clock } from 'lucide-react'
import { isHeicFile, convertHeicToJpeg } from '@/shared/utils/heic-converter'

interface Profile {
  id: string
  email: string
  name: string
  phone?: string
  address?: string
  kycStatus?: string
  kycDocuments?: Array<{
    id: string
    name: string
    status: string
    uploadedAt?: string
    mediaUuid?: string
    verificationResult?: {
      facesMatch?: boolean
      confidence?: number
      details?: string
    }
  }>
}

export default function InvestorProfilePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<string>('personal')
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState<Record<string, boolean>>({})
  const [converting, setConverting] = React.useState<Record<string, boolean>>({})
  const [error, setError] = React.useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = React.useState<string | null>(null)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null)
  const [changingPassword, setChangingPassword] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    address: '',
  })
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Set active tab from URL query parameter on mount and when URL changes
  React.useEffect(() => {
    const updateTabFromUrl = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const tab = params.get('tab')
        if (tab && ['personal', 'kyc', 'security'].includes(tab)) {
          setActiveTab(tab)
        } else if (!tab) {
          setActiveTab('personal')
        }
      }
    }

    // Update on mount
    updateTabFromUrl()

    // Listen for popstate events (back/forward browser buttons)
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', updateTabFromUrl)

      return () => {
        window.removeEventListener('popstate', updateTabFromUrl)
      }
    }
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Update URL without reloading page
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (value === 'personal') {
        params.delete('tab')
      } else {
        params.set('tab', value)
      }
      const newUrl = params.toString() ? `/i/profile?${params.toString()}` : '/i/profile'
      router.replace(newUrl, { scroll: false })
    }
  }

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/altrp/v1/i/profile', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to load profile')
        }

        const data = await response.json() as { profile: Profile }
        setProfile(data.profile)
        setFormData({
          name: data.profile.name || '',
          phone: data.profile.phone || '',
          address: data.profile.address || '',
        })
      } catch (err) {
        console.error('Profile fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/altrp/v1/i/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string; message?: string }
        throw new Error(data.error || data.message || 'Failed to update profile')
      }

      // Reload profile
      const reloadResponse = await fetch('/api/altrp/v1/i/profile', {
        credentials: 'include',
      })
      if (reloadResponse.ok) {
        const data = await reloadResponse.json() as { profile: Profile }
        setProfile(data.profile)
      }
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const getKycStatusBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Верифицирован</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />На проверке</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Отклонен</Badge>
      default:
        return <Badge variant="outline">Не начата</Badge>
    }
  }

  const requiredDocuments = [
    { id: 'selfie_with_passport', name: 'Селфи с паспортом', required: true, special: true },
    { id: 'passport_registration', name: 'Паспорт (страница с регистрацией)', required: true },
    { id: 'income_certificate', name: 'Справка о доходах', required: true },
  ]

  const handlePasswordChange = async () => {
    try {
      setChangingPassword(true)
      setPasswordError(null)
      setPasswordSuccess(null)

      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setPasswordError('Все поля обязательны')
        return
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('Новый пароль и подтверждение не совпадают')
        return
      }

      if (passwordData.newPassword.length < 8) {
        setPasswordError('Пароль должен быть не менее 8 символов')
        return
      }

      const response = await fetch('/api/altrp/v1/i/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string; message?: string }
        throw new Error(data.message || data.error || 'Не удалось изменить пароль')
      }

      setPasswordSuccess('Пароль успешно изменен')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(null), 3000)
    } catch (err) {
      console.error('Password change error:', err)
      setPasswordError(err instanceof Error ? err.message : 'Не удалось изменить пароль')
      setPasswordSuccess(null)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleFileUpload = async (documentType: string, file: File) => {
    try {
      setError(null)
      setUploadSuccess(null)

      // Check file size (limit to 20MB)
      const maxSize = 20 * 1024 * 1024 // 20MB
      if (file.size > maxSize) {
        setError('Файл слишком большой. Максимальный размер: 20 МБ')
        return
      }

      // Convert HEIC to JPEG if needed
      let fileToUpload = file
      if (isHeicFile(file)) {
        try {
          setConverting(prev => ({ ...prev, [documentType]: true }))
          fileToUpload = await convertHeicToJpeg(file)
        } catch (conversionError) {
          setError(conversionError instanceof Error ? conversionError.message : 'Не удалось обработать фото в формате HEIC')
          return
        } finally {
          setConverting(prev => ({ ...prev, [documentType]: false }))
        }
      }

      setUploading(prev => ({ ...prev, [documentType]: true }))

      const formData = new FormData()
      formData.append('file', fileToUpload)
      formData.append('type', documentType)

      // Special handling for selfie with passport - use verification endpoint
      const endpoint = documentType === 'selfie_with_passport' 
        ? '/api/altrp/v1/i/profile/verify-selfie-with-passport'
        : '/api/altrp/v1/i/profile/kyc-documents'

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string; message?: string }
        throw new Error(data.error || data.message || 'Не удалось загрузить документ')
      }

      // Show success message with verification result for selfie
      const docName = requiredDocuments.find(d => d.id === documentType)?.name || 'Документ'
      
      if (documentType === 'selfie_with_passport') {
        const result = await response.json() as { 
          success: boolean
          facesMatch?: boolean
          confidence?: number
          message?: string 
        }
        
        // Use message from API if available (it handles error cases properly)
        if (result.message) {
          setUploadSuccess(result.message)
        } else if (result.facesMatch) {
          const confidence = Math.round((result.confidence || 0) * 100)
          setUploadSuccess(`${docName} успешно загружено и верифицировано! Совпадение: ${confidence}%`)
        } else {
          setUploadSuccess(`${docName} загружено, но верификация не прошла. Попробуйте другое фото.`)
        }
      } else {
        setUploadSuccess(`${docName} успешно загружен`)
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setUploadSuccess(null), 5000)

      // Reload profile to show updated documents
      const reloadResponse = await fetch('/api/altrp/v1/i/profile', {
        credentials: 'include',
      })
      if (reloadResponse.ok) {
        const data = await reloadResponse.json() as { profile: Profile }
        setProfile(data.profile)
      }
    } catch (err) {
      console.error('File upload error:', err)
      setError(err instanceof Error ? err.message : 'Не удалось загрузить документ')
      setUploadSuccess(null)
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Мой профиль</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="personal">Личные данные</TabsTrigger>
            <TabsTrigger value="kyc">Документы KYC</TabsTrigger>
            <TabsTrigger value="security">Безопасность</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Личные данные</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ФИО *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Адрес</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Адрес проживания"
                    rows={3}
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить изменения'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Документы KYC</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                {uploadSuccess && (
                  <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
                    <p className="text-sm text-green-700 dark:text-green-400">{uploadSuccess}</p>
                  </div>
                )}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Текущий статус верификации</AlertTitle>
                  <AlertDescription>
                    {getKycStatusBadge(profile?.kycStatus)}
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Требуемые документы</h3>
                  
                  {/* Special instruction for selfie with passport */}
                  <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900 dark:text-blue-100">
                      Как сделать селфи с паспортом
                    </AlertTitle>
                    <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
                      <p>• Держите паспорт открытым на главной странице рядом с лицом</p>
                      <p>• Убедитесь, что фото паспорта и ваше лицо четко видны</p>
                      <p>• Хорошее освещение - лучше при дневном свете</p>
                      <p>• Только одно лицо в кадре - ваше</p>
                    </AlertDescription>
                  </Alert>

                  <ul className="space-y-4">
                    {requiredDocuments.map((doc) => {
                      const uploadedDoc = profile?.kycDocuments?.find((d) => d.id === doc.id)
                      return (
                        <li key={doc.id} className="flex items-center justify-between border-b pb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{doc.name}</span>
                              {doc.required && (
                                <Badge variant="outline" className="text-xs">Обязательно</Badge>
                              )}
                            </div>
                            {uploadedDoc && (
                              <div className="mt-1 space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {uploadedDoc.status === 'verified' && (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                  )}
                                  {uploadedDoc.status === 'pending' && (
                                    <Clock className="h-3 w-3 text-yellow-600" />
                                  )}
                                  {uploadedDoc.status === 'rejected' && (
                                    <XCircle className="h-3 w-3 text-red-600" />
                                  )}
                                  <span>Статус: {uploadedDoc.status}</span>
                                  {uploadedDoc.uploadedAt && (
                                    <span>• Загружен: {new Date(uploadedDoc.uploadedAt).toLocaleDateString('ru-RU')}</span>
                                  )}
                                </div>
                                {doc.id === 'selfie_with_passport' && uploadedDoc.verificationResult && (() => {
                                  // Parse verification details to check for errors
                                  let verificationDetails: any = null
                                  let hasError = false
                                  
                                  try {
                                    if (uploadedDoc.verificationResult.details) {
                                      verificationDetails = typeof uploadedDoc.verificationResult.details === 'string'
                                        ? JSON.parse(uploadedDoc.verificationResult.details)
                                        : uploadedDoc.verificationResult.details
                                      hasError = !!verificationDetails?.error
                                    }
                                  } catch (e) {
                                    // Ignore parsing errors
                                  }
                                  
                                  // Don't show verification details if there was an API error
                                  if (hasError) {
                                    return null
                                  }
                                  
                                  return (
                                    <div className="text-xs space-y-1">
                                      {uploadedDoc.verificationResult.facesMatch !== undefined && (
                                        <div className={`flex items-center gap-1 ${uploadedDoc.verificationResult.facesMatch ? 'text-green-600' : 'text-red-600'}`}>
                                          {uploadedDoc.verificationResult.facesMatch ? (
                                            <CheckCircle className="h-3 w-3" />
                                          ) : (
                                            <XCircle className="h-3 w-3" />
                                          )}
                                          <span>
                                            {uploadedDoc.verificationResult.facesMatch ? 'Лица совпадают' : 'Лица не совпадают'}
                                          </span>
                                        </div>
                                      )}
                                      {uploadedDoc.verificationResult.confidence !== undefined && uploadedDoc.verificationResult.confidence > 0 && (
                                        <div className="text-muted-foreground">
                                          Уверенность: {Math.round(uploadedDoc.verificationResult.confidence * 100)}%
                                        </div>
                                      )}
                                      {verificationDetails?.reasons && Array.isArray(verificationDetails.reasons) && verificationDetails.reasons.length > 0 && (
                                        <div className="text-muted-foreground">
                                          {verificationDetails.reasons.map((reason: string, idx: number) => (
                                            <div key={idx}>• {reason}</div>
                                          ))}
                                        </div>
                                      )}
                                      {/* Show preview of uploaded selfie */}
                                      {uploadedDoc.mediaUuid && (
                                        <div className="mt-2">
                                          <img 
                                            src={`/api/altrp/v1/media/${uploadedDoc.mediaUuid}`}
                                            alt="Selfie preview" 
                                            className="h-24 w-24 object-cover rounded-md border shadow-sm"
                                            onError={(e) => {
                                              // Hide broken image
                                              (e.target as HTMLImageElement).style.display = 'none'
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>
                            )}
                          </div>
                          <div>
                            <Input
                              type="file"
                              accept={doc.id === 'selfie_with_passport' ? 'image/*,.heic,.heif' : 'image/*,.pdf,.heic,.heif'}
                              className="hidden"
                              id={`file-${doc.id}`}
                              disabled={uploading[doc.id] || converting[doc.id]}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleFileUpload(doc.id, file)
                                }
                                // Reset input value to allow re-uploading the same file
                                e.target.value = ''
                              }}
                            />
                            <Label
                              htmlFor={`file-${doc.id}`}
                              className={(uploading[doc.id] || converting[doc.id]) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
                              <Button variant="outline" size="sm" disabled={uploading[doc.id] || converting[doc.id]} asChild>
                                <span>
                                  {converting[doc.id] ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Конвертация...
                                    </>
                                  ) : uploading[doc.id] ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Загрузка...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="mr-2 h-4 w-4" />
                                      {uploadedDoc ? 'Заменить' : 'Загрузить'}
                                    </>
                                  )}
                                </span>
                              </Button>
                            </Label>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Смена пароля</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">{passwordError}</p>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
                    <p className="text-sm text-green-700 dark:text-green-400">{passwordSuccess}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Текущий пароль *</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Введите текущий пароль"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Новый пароль *</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Введите новый пароль (минимум 8 символов)"
                  />
                  <p className="text-sm text-muted-foreground">
                    Пароль должен содержать не менее 8 символов
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Подтвердите новый пароль *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Повторите новый пароль"
                  />
                </div>

                <Button onClick={handlePasswordChange} disabled={changingPassword}>
                  {changingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Изменение...
                    </>
                  ) : (
                    'Изменить пароль'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  )
}

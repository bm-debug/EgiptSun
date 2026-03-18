"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import type { Value as E164Number } from "react-phone-number-input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { Logo } from "@/components/misc/logo/logo"

const PhoneInput = dynamic(
  () => import("@/components/ui/phone-input").then((mod) => mod.PhoneInput),
  { ssr: false }
)

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [firstNameError, setFirstNameError] = useState<string | null>(null)
  const [lastNameError, setLastNameError] = useState<string | null>(null)
  const [middleNameError, setMiddleNameError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  // Validate Cyrillic characters
  const cyrillicRegex = /^[А-Яа-яЁё\s-]*$/

  // Handle first name change with validation
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, firstName: value }))
    
    // Validate on change
    if (value && !cyrillicRegex.test(value)) {
      setFirstNameError("Имя должно содержать только кириллические символы")
    } else {
      setFirstNameError(null)
    }
  }

  // Handle last name change with validation
  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, lastName: value }))
    
    // Validate on change
    if (value && !cyrillicRegex.test(value)) {
      setLastNameError("Фамилия должна содержать только кириллические символы")
    } else {
      setLastNameError(null)
    }
  }

  // Handle middle name change with validation
  const handleMiddleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, middleName: value }))
    
    // Validate on change (only if value is provided)
    if (value && !cyrillicRegex.test(value)) {
      setMiddleNameError("Отчество должно содержать только кириллические символы")
    } else {
      setMiddleNameError(null)
    }
  }

  // Check if form is valid
  const isFormValid = () => {
    const firstNameValid = !formData.firstName || cyrillicRegex.test(formData.firstName)
    const lastNameValid = !formData.lastName || cyrillicRegex.test(formData.lastName)
    const middleNameValid = !formData.middleName || cyrillicRegex.test(formData.middleName)
    return firstNameValid && lastNameValid && middleNameValid
  }

  const handleAcceptTermsChange = (checked: boolean | "indeterminate") => {
    setFormData((prev) => ({
      ...prev,
      acceptTerms: checked === true,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formData.acceptTerms) {
      setError("Необходимо принять условия обработки персональных данных.")
      return
    }

    // Validate required fields
    if (!formData.lastName?.trim()) {
      setError("Фамилия обязательна для заполнения.")
      return
    }

    if (!formData.firstName?.trim()) {
      setError("Имя обязательно для заполнения.")
      return
    }

    if (!formData.phone?.trim()) {
      setError("Телефон обязателен для заполнения.")
      return
    }

    // Validate Cyrillic characters before submit
    const firstNameValid = !formData.firstName || cyrillicRegex.test(formData.firstName)
    const lastNameValid = !formData.lastName || cyrillicRegex.test(formData.lastName)
    const middleNameValid = !formData.middleName || cyrillicRegex.test(formData.middleName)

    if (!firstNameValid) {
      setFirstNameError("Имя должно содержать только кириллические символы")
    }
    if (!lastNameValid) {
      setLastNameError("Фамилия должна содержать только кириллические символы")
    }
    if (!middleNameValid) {
      setMiddleNameError("Отчество должно содержать только кириллические символы")
    }

    if (!firstNameValid || !lastNameValid || !middleNameValid) {
      setError("Пожалуйста, исправьте ошибки в форме перед отправкой")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/altrp/v1/auth/register-consumer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          lastName: formData.lastName.trim(),
          firstName: formData.firstName.trim(),
          middleName: formData.middleName?.trim() || undefined,
          phone: formData.phone,
        }),
      })

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; message?: string }
        | null

      if (!response.ok || !data?.success) {
        const errorMessage = data?.error || data?.message || "Не удалось завершить регистрацию"
        
        // Check if error is about Cyrillic validation
        if (errorMessage.includes("кириллические символы") || errorMessage.includes("русские буквы") || 
            errorMessage.includes("Имя") || errorMessage.includes("Фамилия") || errorMessage.includes("Отчество")) {
          if (errorMessage.includes("Имя")) {
            setFirstNameError("Имя должно содержать только кириллические символы")
          }
          if (errorMessage.includes("Фамилия")) {
            setLastNameError("Фамилия должна содержать только кириллические символы")
          }
          if (errorMessage.includes("Отчество")) {
            setMiddleNameError("Отчество должно содержать только кириллические символы")
          }
        }
        
        throw new Error(errorMessage)
      }

      setSuccess(data.message || "Регистрация завершена. Проверьте email, чтобы подтвердить адрес.")
      setCompleted(true)
      setFirstNameError(null)
      setLastNameError(null)
      setMiddleNameError(null)
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Logo className="h-12" />
          </div>
          <CardTitle className="text-2xl text-center">Регистрация</CardTitle>
          <CardDescription className="text-center">
            Создайте аккаунт Потребителя, чтобы подать заявку на рассрочку и управлять платежами.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-800">
                {success}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Фамилия <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Иванов"
                  value={formData.lastName}
                  onChange={handleLastNameChange}
                  className={lastNameError ? "border-destructive" : ""}
                  aria-invalid={!!lastNameError}
                  aria-describedby={lastNameError ? "lastName-error" : undefined}
                  required
                  disabled={loading || completed}
                  autoComplete="family-name"
                  pattern="^[А-Яа-яЁё\s-]+$"
                />
                {lastNameError && (
                  <p id="lastName-error" className="text-xs text-destructive">
                    {lastNameError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Имя <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Иван"
                  value={formData.firstName}
                  onChange={handleFirstNameChange}
                  className={firstNameError ? "border-destructive" : ""}
                  aria-invalid={!!firstNameError}
                  aria-describedby={firstNameError ? "firstName-error" : undefined}
                  required
                  disabled={loading || completed}
                  autoComplete="given-name"
                  pattern="^[А-Яа-яЁё\s-]+$"
                />
                {firstNameError && (
                  <p id="firstName-error" className="text-xs text-destructive">
                    {firstNameError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Отчество</Label>
                <Input
                  id="middleName"
                  type="text"
                  placeholder="Иванович"
                  value={formData.middleName}
                  onChange={handleMiddleNameChange}
                  className={middleNameError ? "border-destructive" : ""}
                  aria-invalid={!!middleNameError}
                  aria-describedby={middleNameError ? "middleName-error" : undefined}
                  disabled={loading || completed}
                  autoComplete="additional-name"
                  pattern="^[А-Яа-яЁё\s-]+$"
                />
                {middleNameError && (
                  <p id="middleName-error" className="text-xs text-destructive">
                    {middleNameError}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading || completed}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Телефон <span className="text-destructive">*</span>
              </Label>
              <PhoneInput
                defaultCountry="RU"
                placeholder="+7 (999) 999-99-99"
                value={(formData.phone || "") as E164Number}
                onChange={(value) => setFormData((prev) => ({ ...prev, phone: value ?? "" }))}
                disabled={loading || completed}
                hideCountrySelector
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Пароль <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Минимум 8 символов"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading || completed}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Подтверждение пароля <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Повторите пароль"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading || completed}
                autoComplete="new-password"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="acceptTerms"
                checked={formData.acceptTerms}
                onCheckedChange={handleAcceptTermsChange}
                disabled={loading || completed}
              />
              <Label htmlFor="acceptTerms" className="text-sm leading-none">
                Я соглашаюсь с условиями обработки персональных данных и пользовательским соглашением.
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || completed || !isFormValid()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Регистрация...
                </>
              ) : (
                "Зарегистрироваться"
              )}
            </Button>

            {completed && (
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>После подтверждения email вы сможете войти в личный кабинет.</p>
                <Button asChild variant="outline">
                  <Link href="/login">Перейти к форме входа</Link>
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}



"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/packages/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { QuestionnaireBuilder } from "./QuestionnaireBuilder"

interface CampaignWizardProps {
  gameId: string
  onComplete: (campaignData: CampaignData) => Promise<void>
}

export interface CampaignData {
  // Step 1: General
  title: string
  type: "bugtest" | "playtest" | "survey"
  rewardPerReport: number
  participantLimit: number
  totalBudget: number

  // Step 2: Instructions
  description: string
  minimumPlaytime?: number
  platformRequirement?: string
  screenRecordingRequired: boolean
  build: string

  // Step 3: Questionnaire (will be added)
  questionnaire: QuestionnaireItem[]

  // Step 4: Review data
  walletBalance?: number
}

export interface QuestionnaireItem {
  id: string
  type: "star_rating" | "text_area" | "single_choice" | "attachment"
  question: string
  required: boolean
  options?: string[] // For single_choice
  order: number
}

const STEPS = [
  { id: "general", title: "Настройки", description: "Настройки кампании и бюджет" },
  { id: "instructions", title: "ТЗ для тестера", description: "Что нужно сделать тестеру" },
  { id: "questionnaire", title: "Конструктор анкеты", description: "Соберите форму отчета" },
  { id: "review", title: "Публикация", description: "Проверьте и опубликуйте" },
]

export function CampaignWizard({ gameId, onComplete }: CampaignWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState<CampaignData>({
    title: "",
    type: "bugtest",
    rewardPerReport: 100,
    participantLimit: 50,
    totalBudget: 5000,
    description: "",
    screenRecordingRequired: false,
    build: "",
    questionnaire: [],
  })

  // Fetch wallet balance when reaching step 3
  React.useEffect(() => {
    if (currentStep === 3 && formData.walletBalance === undefined) {
      fetch("/api/altrp/v1/s/wallets", { credentials: "include" })
        .then((res) => res.json() as Promise<{ success?: boolean; wallets?: Array<{ balance?: number }> }>)
        .then((data) => {
          if (data.success && data.wallets && data.wallets.length > 0) {
            const balance = data.wallets[0].balance || 0
            setFormData((prev) => ({ ...prev, walletBalance: balance }))
          } else {
            setFormData((prev) => ({ ...prev, walletBalance: 0 }))
          }
        })
        .catch(() => {
          setFormData((prev) => ({ ...prev, walletBalance: 0 }))
        })
    }
  }, [currentStep, formData.walletBalance])

  // Calculate total budget when reward or limit changes
  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      totalBudget: prev.rewardPerReport * prev.participantLimit,
    }))
  }, [formData.rewardPerReport, formData.participantLimit])

  const validateStep = (stepIndex: number): string[] => {
    const errors: string[] = []

    if (stepIndex === 0) {
      // Step 1: General
      if (!formData.title.trim()) {
        errors.push("Название обязательно")
      }
      if (formData.rewardPerReport <= 0) {
        errors.push("Награда за отчет должна быть больше 0")
      }
      if (formData.participantLimit <= 0) {
        errors.push("Лимит участников должен быть больше 0")
      }
    }

    if (stepIndex === 1) {
      // Step 2: Instructions
      if (!formData.description.trim()) {
        errors.push("Описание обязательно")
      }
      if (!formData.build.trim()) {
        errors.push("Выбор билда обязателен")
      }
    }

    if (stepIndex === 2) {
      // Step 3: Questionnaire
      if (formData.questionnaire.length === 0) {
        errors.push("Необходимо добавить хотя бы один вопрос")
      }
      for (const item of formData.questionnaire) {
        if (!item.question.trim()) {
          errors.push("Все вопросы должны иметь текст")
        }
        if (item.type === "single_choice" && (!item.options || item.options.length < 2)) {
          errors.push("Вопросы с выбором должны иметь минимум 2 варианта")
        }
      }
    }

    if (stepIndex === 3) {
      // Step 4: Review & Pay
      if (formData.walletBalance !== undefined && formData.walletBalance < formData.totalBudget) {
        errors.push("Недостаточно средств на кошельке")
      }
    }

    return errors
  }

  const handleNext = () => {
    const errors = validateStep(currentStep)
    if (errors.length > 0) {
      setError(errors.join(", "))
      return
    }
    setError(null)
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    const errors = validateStep(currentStep)
    if (errors.length > 0) {
      setError(errors.join(", "))
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onComplete(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать кампанию")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  index === currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : index < currentStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-background text-muted-foreground"
                }`}
              >
                {index < currentStep ? "✓" : index + 1}
              </div>
              <div className="ml-3 hidden md:block">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  index < currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  placeholder="например, Тест первого уровня"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Тип</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "bugtest" | "playtest" | "survey") =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bugtest">Bugtest</SelectItem>
                    <SelectItem value="playtest">Playtest</SelectItem>
                    <SelectItem value="survey">Survey</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="reward">Награда за 1 отчет (в баллах)</Label>
                  <Input
                    id="reward"
                    type="number"
                    min="1"
                    value={formData.rewardPerReport}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rewardPerReport: Number(e.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="limit">Лимит участников</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="1"
                    value={formData.participantLimit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        participantLimit: Number(e.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Итоговая стоимость:</span>
                  <span className="text-2xl font-bold">{formData.totalBudget} баллов</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.participantLimit} участников × {formData.rewardPerReport} баллов
                </p>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  placeholder="Опишите что нужно сделать тестеру..."
                  rows={6}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="playtime">Минимальное время игры (минуты)</Label>
                  <Input
                    id="playtime"
                    type="number"
                    min="0"
                    value={formData.minimumPlaytime || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        minimumPlaytime: Number(e.target.value) || undefined,
                      }))
                    }
                    placeholder="Необязательно"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="platform">Требование платформы</Label>
                  <Input
                    id="platform"
                    value={formData.platformRequirement || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        platformRequirement: e.target.value || undefined,
                      }))
                    }
                    placeholder="например, Windows, macOS, Linux"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="screen-recording"
                  checked={formData.screenRecordingRequired}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      screenRecordingRequired: checked === true,
                    }))
                  }
                />
                <Label htmlFor="screen-recording" className="cursor-pointer">
                  Требование записи экрана
                </Label>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="build">Выбор версии игры</Label>
                <Input
                  id="build"
                  value={formData.build}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, build: e.target.value }))
                  }
                  placeholder="Ссылка Steam/TestFlight или версия билда"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Введите прямую ссылку (Steam/TestFlight) или идентификатор версии билда
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <QuestionnaireBuilder
              items={formData.questionnaire}
              onChange={(items) => setFormData((prev) => ({ ...prev, questionnaire: items }))}
            />
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Сводка кампании</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Настройки</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Название:</span>
                        <span className="font-medium">{formData.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Тип:</span>
                        <span className="font-medium capitalize">{formData.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Награда за отчет:</span>
                        <span className="font-medium">{formData.rewardPerReport} баллов</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Лимит участников:</span>
                        <span className="font-medium">{formData.participantLimit}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Итоговый бюджет:</span>
                        <span className="font-bold text-lg">{formData.totalBudget} баллов</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">ТЗ для тестера</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Описание:</span>
                        <p className="mt-1">{formData.description || "—"}</p>
                      </div>
                      {formData.minimumPlaytime && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Мин. время игры:</span>
                          <span className="font-medium">{formData.minimumPlaytime} мин</span>
                        </div>
                      )}
                      {formData.platformRequirement && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Платформа:</span>
                          <span className="font-medium">{formData.platformRequirement}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Запись экрана:</span>
                        <span className="font-medium">
                          {formData.screenRecordingRequired ? "Требуется" : "Не требуется"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Билд:</span>
                        <p className="mt-1 font-medium">{formData.build}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Анкета</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formData.questionnaire.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Вопросы не добавлены</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.questionnaire.map((item, index) => (
                          <div key={item.id} className="flex items-start gap-2 text-sm">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <span className="font-medium">{item.question}</span>
                            <span className="text-muted-foreground">
                              ({item.type.replace("_", " ")}) {item.required && "*"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>Баланс кошелька</CardTitle>
                  <CardDescription>Доступные средства для этой кампании</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formData.walletBalance !== undefined
                        ? `${formData.walletBalance} баллов`
                        : "Загрузка..."}
                    </span>
                    {formData.walletBalance !== undefined &&
                      formData.walletBalance < formData.totalBudget && (
                        <span className="text-sm text-destructive">
                          Недостаточно средств. Вам нужно еще {formData.totalBudget - formData.walletBalance}{" "}
                          баллов.
                        </span>
                      )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Далее
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? "Публикация..." : "Заблокировать средства и опубликовать"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

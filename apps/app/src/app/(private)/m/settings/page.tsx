'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import { Loader2, Save, Shield } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useMe } from '@/providers/MeProvider'
import { ScoringWeights, ScoringThresholds } from '@/shared/types/scoring'

export default function AdminSettingsPage() {
  const router = useRouter()
  const { user: meUser } = useMe()
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const [weights, setWeights] = React.useState<ScoringWeights | null>(null)
  const [thresholds, setThresholds] = React.useState<ScoringThresholds | null>(null)

  const weightsUuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890'
  const thresholdsUuid = 'b2c3d4e5-f6a7-4901-bcde-f23456789012'

  // Check if user is super admin (has Administrator role)
  const isSuperAdmin = meUser?.roles?.some((role) => role.name === 'Administrator') || false

  React.useEffect(() => {
    fetchSettings()
  }, [])

  const normalizeWeights = (data: Partial<ScoringWeights> | null | undefined): ScoringWeights => {
    if (!data) {
      return {
        initialScore: 0,
        modifiers: {
          maritalStatus: {
            married: 0,
            divorced: 0,
          },
          income: {
            high: {
              threshold: 0,
              value: 0,
            },
            low: {
              threshold: 0,
              value: 0,
            },
          },
          creditHistory: {
            negativeKeywords: [],
            value: 0,
          },
          guarantors: {
            guarantor1: 0,
            guarantor2: 0,
          },
        },
      }
    }

    return {
      initialScore: data.initialScore ?? 0,
      modifiers: {
        maritalStatus: {
          married: data.modifiers?.maritalStatus?.married ?? 0,
          divorced: data.modifiers?.maritalStatus?.divorced ?? 0,
        },
        income: {
          high: {
            threshold: data.modifiers?.income?.high?.threshold ?? 0,
            value: data.modifiers?.income?.high?.value ?? 0,
          },
          low: {
            threshold: data.modifiers?.income?.low?.threshold ?? 0,
            value: data.modifiers?.income?.low?.value ?? 0,
          },
        },
        creditHistory: {
          negativeKeywords: data.modifiers?.creditHistory?.negativeKeywords ?? [],
          value: data.modifiers?.creditHistory?.value ?? 0,
        },
        guarantors: {
          guarantor1: data.modifiers?.guarantors?.guarantor1 ?? 0,
          guarantor2: data.modifiers?.guarantors?.guarantor2 ?? 0,
        },
      },
    }
  }

  const normalizeThresholds = (data: Partial<ScoringThresholds> | null | undefined): ScoringThresholds => {
    if (!data) {
      return {
        low: {
          min: 0,
          label: '',
        },
        medium: {
          min: 0,
          max: 0,
          label: '',
        },
        high: {
          max: 0,
          label: '',
        },
      }
    }

    return {
      low: {
        min: data.low?.min ?? 0,
        label: data.low?.label ?? '',
      },
      medium: {
        min: data.medium?.min ?? 0,
        max: data.medium?.max ?? 0,
        label: data.medium?.label ?? '',
      },
      high: {
        max: data.high?.max ?? 0,
        label: data.high?.label ?? '',
      },
    }
  }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      const [weightsRes, thresholdsRes] = await Promise.all([
        fetch(`/api/altrp/v1/admin/settings?uuid=${weightsUuid}`, {
          credentials: 'include',
        }),
        fetch(`/api/altrp/v1/admin/settings?uuid=${thresholdsUuid}`, {
          credentials: 'include',
        }),
      ])

      if (!weightsRes.ok || !thresholdsRes.ok) {
        throw new Error('Failed to fetch settings')
      }

      const weightsData = await weightsRes.json() as { success: boolean; settings?: { dataIn?: ScoringWeights } }
      const thresholdsData = await thresholdsRes.json() as { success: boolean; settings?: { dataIn?: ScoringThresholds } }

      const hasWeights = weightsData.success && weightsData.settings?.dataIn
      const hasThresholds = thresholdsData.success && thresholdsData.settings?.dataIn

      // If both settings are missing, redirect to seed page
      if (!hasWeights && !hasThresholds) {
        router.push('/m/seed')
        return
      }

      if (hasWeights && weightsData.settings?.dataIn) {
        setWeights(normalizeWeights(weightsData.settings.dataIn))
      } else {
        setWeights(normalizeWeights(null))
      }

      if (hasThresholds && thresholdsData.settings?.dataIn) {
        setThresholds(normalizeThresholds(thresholdsData.settings.dataIn))
      } else {
        setThresholds(normalizeThresholds(null))
      }
    } catch (err) {
      console.error('Fetch settings error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
      // Set default values on error
      setWeights(normalizeWeights(null))
      setThresholds(normalizeThresholds(null))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveWeights = async () => {
    if (!weights) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/altrp/v1/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: weightsUuid,
          dataIn: weights,
        }),
      })

      if (!response.ok) {
        const error = await response.json() as { error?: string }
        throw new Error(error.error || 'Failed to save weights')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Save weights error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save weights')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveThresholds = async () => {
    if (!thresholds) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/api/altrp/v1/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: thresholdsUuid,
          dataIn: thresholds,
        }),
      })

      if (!response.ok) {
        const error = await response.json() as { error?: string }
        throw new Error(error.error || 'Failed to save thresholds')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Save thresholds error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save thresholds')
    } finally {
      setSaving(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <>
        <AdminHeader title="Настройки" />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                У вас нет доступа к этой странице. Только супер-администраторы могут изменять настройки системы.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Настройки" />
        <main className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Настройки" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>Настройки успешно сохранены</AlertDescription>
            </Alert>
          )}

          {/* Scoring Weights */}
          <Card>
            <CardHeader>
              <CardTitle>Веса для расчета скорингового балла</CardTitle>
              <CardDescription>
                Настройте веса модификаторов для расчета скорингового балла заявок
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {weights ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="initialScore">Начальный балл</Label>
                    <Input
                      id="initialScore"
                      type="number"
                      value={weights.initialScore}
                      onChange={(e) =>
                        setWeights({
                          ...weights,
                          initialScore: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Семейное положение</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="married">Женат/Замужем</Label>
                        <Input
                          id="married"
                          type="number"
                          value={weights.modifiers.maritalStatus.married}
                          onChange={(e) =>
                            setWeights({
                              ...weights,
                              modifiers: {
                                ...weights.modifiers,
                                maritalStatus: {
                                  ...weights.modifiers.maritalStatus,
                                  married: Number(e.target.value),
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="divorced">Разведен/Разведена</Label>
                        <Input
                          id="divorced"
                          type="number"
                          value={weights.modifiers.maritalStatus.divorced}
                          onChange={(e) =>
                            setWeights({
                              ...weights,
                              modifiers: {
                                ...weights.modifiers,
                                maritalStatus: {
                                  ...weights.modifiers.maritalStatus,
                                  divorced: Number(e.target.value),
                                },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Доход</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="incomeHighThreshold">Порог высокого дохода (₽)</Label>
                        <Input
                          id="incomeHighThreshold"
                          type="number"
                          value={weights.modifiers.income.high.threshold}
                          onChange={(e) =>
                            setWeights({
                              ...weights,
                              modifiers: {
                                ...weights.modifiers,
                                income: {
                                  ...weights.modifiers.income,
                                  high: {
                                    ...weights.modifiers.income.high,
                                    threshold: Number(e.target.value),
                                  },
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="incomeHighValue">Балл за высокий доход</Label>
                        <Input
                          id="incomeHighValue"
                          type="number"
                          value={weights.modifiers.income.high.value}
                          onChange={(e) =>
                            setWeights({
                              ...weights,
                              modifiers: {
                                ...weights.modifiers,
                                income: {
                                  ...weights.modifiers.income,
                                  high: {
                                    ...weights.modifiers.income.high,
                                    value: Number(e.target.value),
                                  },
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="incomeLowThreshold">Порог низкого дохода (₽)</Label>
                        <Input
                          id="incomeLowThreshold"
                          type="number"
                          value={weights.modifiers.income.low.threshold}
                          onChange={(e) =>
                            setWeights({
                              ...weights,
                              modifiers: {
                                ...weights.modifiers,
                                income: {
                                  ...weights.modifiers.income,
                                  low: {
                                    ...weights.modifiers.income.low,
                                    threshold: Number(e.target.value),
                                  },
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="incomeLowValue">Балл за низкий доход</Label>
                        <Input
                          id="incomeLowValue"
                          type="number"
                          value={weights.modifiers.income.low.value}
                          onChange={(e) =>
                            setWeights({
                              ...weights,
                              modifiers: {
                                ...weights.modifiers,
                                income: {
                                  ...weights.modifiers.income,
                                  low: {
                                    ...weights.modifiers.income.low,
                                    value: Number(e.target.value),
                                  },
                                },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Кредитная история</h3>
                    <div className="space-y-2">
                      <Label htmlFor="creditHistoryValue">Балл за отрицательные ключевые слова</Label>
                      <Input
                        id="creditHistoryValue"
                        type="number"
                        value={weights.modifiers.creditHistory.value}
                        onChange={(e) =>
                          setWeights({
                            ...weights,
                            modifiers: {
                              ...weights.modifiers,
                              creditHistory: {
                                ...weights.modifiers.creditHistory,
                                value: Number(e.target.value),
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Поручители</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="guarantor1">Поручитель 1</Label>
                        <Input
                          id="guarantor1"
                          type="number"
                          value={weights.modifiers.guarantors.guarantor1}
                          onChange={(e) =>
                            setWeights({
                              ...weights,
                              modifiers: {
                                ...weights.modifiers,
                                guarantors: {
                                  ...weights.modifiers.guarantors,
                                  guarantor1: Number(e.target.value),
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guarantor2">Поручитель 2</Label>
                        <Input
                          id="guarantor2"
                          type="number"
                          value={weights.modifiers.guarantors.guarantor2}
                          onChange={(e) =>
                            setWeights({
                              ...weights,
                              modifiers: {
                                ...weights.modifiers,
                                guarantors: {
                                  ...weights.modifiers.guarantors,
                                  guarantor2: Number(e.target.value),
                                },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveWeights} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Сохранить веса
                      </>
                    )}
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Scoring Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle>Пороговые значения риска</CardTitle>
              <CardDescription>
                Настройте пороговые значения для определения уровня риска заявки
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {thresholds ? (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Низкий риск</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lowMin">Минимальный балл</Label>
                        <Input
                          id="lowMin"
                          type="number"
                          value={thresholds.low.min}
                          onChange={(e) =>
                            setThresholds({
                              ...thresholds,
                              low: {
                                ...thresholds.low,
                                min: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lowLabel">Название</Label>
                        <Input
                          id="lowLabel"
                          type="text"
                          value={thresholds.low.label}
                          onChange={(e) =>
                            setThresholds({
                              ...thresholds,
                              low: {
                                ...thresholds.low,
                                label: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Средний риск</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mediumMin">Минимальный балл</Label>
                        <Input
                          id="mediumMin"
                          type="number"
                          value={thresholds.medium.min}
                          onChange={(e) =>
                            setThresholds({
                              ...thresholds,
                              medium: {
                                ...thresholds.medium,
                                min: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mediumMax">Максимальный балл</Label>
                        <Input
                          id="mediumMax"
                          type="number"
                          value={thresholds.medium.max}
                          onChange={(e) =>
                            setThresholds({
                              ...thresholds,
                              medium: {
                                ...thresholds.medium,
                                max: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mediumLabel">Название</Label>
                        <Input
                          id="mediumLabel"
                          type="text"
                          value={thresholds.medium.label}
                          onChange={(e) =>
                            setThresholds({
                              ...thresholds,
                              medium: {
                                ...thresholds.medium,
                                label: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Высокий риск</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="highMax">Максимальный балл</Label>
                        <Input
                          id="highMax"
                          type="number"
                          value={thresholds.high.max}
                          onChange={(e) =>
                            setThresholds({
                              ...thresholds,
                              high: {
                                ...thresholds.high,
                                max: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="highLabel">Название</Label>
                        <Input
                          id="highLabel"
                          type="text"
                          value={thresholds.high.label}
                          onChange={(e) =>
                            setThresholds({
                              ...thresholds,
                              high: {
                                ...thresholds.high,
                                label: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveThresholds} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Сохранить пороги
                      </>
                    )}
                  </Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}


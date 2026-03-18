'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import  qs  from 'qs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { useCallback, useEffect, useRef, useMemo } from 'react'
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
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Search, MoreHorizontal, Loader2, Download, Plus, CheckCircle, Clock, XCircle } from 'lucide-react'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import Link from 'next/link'
import { altrpUser } from '@/shared/types/altrp'
import { DbPaginatedResult } from '@/shared/types/shared'
import debounce from 'lodash/debounce'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/shared/utils/date-format'

interface UserWithRoles extends Omit<altrpUser, 'human'> {
  roles?: Array<{
    uuid: string
    title: string | null
    name: string | null
    description: string | null
    isSystem: boolean | null
  }>
  human?: (altrpUser['human'] & {
    kycStatus?: string
  }) | null
}

interface Role {
  uuid: string
  title: string | null
  name: string | null
  description: string | null
  isSystem: boolean | null
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams()

  const [data, setData] = React.useState<DbPaginatedResult<UserWithRoles> | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get('search') || '')
  const [selectedRole, setSelectedRole] = React.useState<string>(searchParams.get('role') || 'all')
  const [selectedKycStatus, setSelectedKycStatus] = React.useState<string>(searchParams.get('kycStatus') || 'all')
  const [kycPendingCount, setKycPendingCount] = React.useState<number>(0)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('')
  const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set())
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
  })

  // Sync state with URL params when they change
  React.useEffect(() => {
    const search = searchParams.get('search')
    const roleFilter = searchParams.get('role')
    const kycFilter = searchParams.get('kycStatus')

    setSearchQuery(search || '')
    setSelectedRole(roleFilter || 'all')
    setSelectedKycStatus(kycFilter || 'all')
  }, [searchParams])


  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [roles, setRoles] = React.useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = React.useState(false)
  
  // Load roles on component mount
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true)
        const response = await fetch('/api/altrp/v1/admin/roles', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch roles')
        }

        const result = await response.json() as { docs?: Role[] }
        setRoles(result.docs || [])
      } catch (err) {
        console.error('Failed to fetch roles:', err)
        setRoles([])
      } finally {
        setLoadingRoles(false)
      }
    }

    fetchRoles()
  }, [])
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    emailVerified: false,
    roleUuids: [] as string[],
  })
  const [formError, setFormError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Debounce search query and handle role filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery || '')
      setPagination((prev) => ({ ...prev, page: 1 }))
      
      const params = qs.parse(window.location.search.replace('?', '').split('#')[0])
      const currentRoleInUrl = params.role || 'all'
      const currentKycInUrl = params.kycStatus || 'all'
      if(params.search === searchQuery && currentRoleInUrl === selectedRole && currentKycInUrl === selectedKycStatus) {
        return
      }
      if (searchQuery) {
        params.search = searchQuery
      } else {
        delete params.search
      }
      if (selectedRole && selectedRole !== 'all') {
        params.role = selectedRole
      } else {
        delete params.role
      }
      if (selectedKycStatus && selectedKycStatus !== 'all') {
        params.kycStatus = selectedKycStatus
      } else {
        delete params.kycStatus
      }
      const newUrl = `/m/users?${qs.stringify(params)}`
      window.history.replaceState({}, '', newUrl)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedRole, selectedKycStatus])

  // Base fetch function
  const fetchUsersBase = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        orderBy: 'createdAt',
        orderDirection: 'desc',
      })
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery)
      }
      if (selectedRole && selectedRole !== 'all') {
        params.append('roles', selectedRole)
      }
      if (selectedKycStatus && selectedKycStatus !== 'all') {
        params.append('kycStatus', selectedKycStatus)
      }

      const response = await fetch(`/api/altrp/v1/admin/users?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`)
      }

      const result: DbPaginatedResult<UserWithRoles> = await response.json()

      setData(result)
    } catch (err) {
      console.error('Users fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load users')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearchQuery, selectedRole, selectedKycStatus])

  // Debounced version of fetchUsers
  const fetchUsers = useMemo(
    () => debounce(fetchUsersBase, 600),
    [fetchUsersBase]
  )

  useEffect(() => {
    fetchUsers()

    // Cleanup debounced function on unmount
    return () => {
      fetchUsers.cancel()
    }
  }, [fetchUsers])

  // Extract KYC status from human (prefer kycStatus field, fallback to dataIn)
  const getKycStatus = (user: UserWithRoles): string | undefined => {
    // First try to use kycStatus field if available (from API)
    if (user.human?.kycStatus) {
      return user.human.kycStatus
    }
    
    // Fallback to parsing dataIn
    if (!user.human?.dataIn) return undefined
    
    try {
      const dataIn = typeof user.human.dataIn === 'string'
        ? JSON.parse(user.human.dataIn)
        : user.human.dataIn
      
      return dataIn?.kycStatus
    } catch (e) {
      console.error('Failed to parse human.dataIn for KYC status:', e)
      return undefined
    }
  }

  // Render KYC badge (same logic as in admin/users/[haid]/page.tsx)
  const renderKycBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Верифицирован
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            На проверке
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Отклонен
          </Badge>
        )
      case 'more_info':
        return (
          <Badge variant="outline">
            Нужно уточнение
          </Badge>
        )
      case 'not_started':
      default:
        return (
          <Badge variant="outline">
            Не начата
          </Badge>
        )
    }
  }

  const users = data?.docs || []

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map((user) => user.uuid)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers)
    if (checked) {
      newSelected.add(userId)
    } else {
      newSelected.delete(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const handleBlock = async (userId: string) => {
    // TODO: Implement block API
    if (data) {
      setData({
        ...data,
        docs: data.docs.map((user) =>
          user.uuid === userId ? { ...user, isActive: false } : user
        ),
      })
    }
  }

  // Load roles when sheet opens
  React.useEffect(() => {
    if (sheetOpen) {
      const fetchRoles = async () => {
        try {
          setLoadingRoles(true)
          const response = await fetch('/api/altrp/v1/admin/roles', {
            credentials: 'include',
          })

          if (!response.ok) {
            throw new Error('Failed to fetch roles')
          }

          const result = await response.json() as { docs?: Role[] }
          setRoles(result.docs || [])
        } catch (err) {
          console.error('Failed to fetch roles:', err)
          setRoles([])
        } finally {
          setLoadingRoles(false)
        }
      }

      fetchRoles()
    }
  }, [sheetOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    try {
      setSubmitting(true)

      const response = await fetch('/api/altrp/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json() as { error?: string; message?: string }
        throw new Error(error.error || error.message || 'Failed to create user')
      }

      // Reset form and close sheet
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        emailVerified: false,
        roleUuids: [],
      })
      setSheetOpen(false)

      // Refresh users list
      fetchUsers()

    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRoleToggle = (roleUuid: string) => {
    setFormData((prev) => {
      const newRoleUuids = prev.roleUuids.includes(roleUuid)
        ? prev.roleUuids.filter((uuid) => uuid !== roleUuid)
        : [...prev.roleUuids, roleUuid]
      return { ...prev, roleUuids: newRoleUuids }
    })
  }

  const [rolesPopoverOpen, setRolesPopoverOpen] = React.useState(false)

  const selectedRolesLabels = roles
    .filter((role) => formData.roleUuids.includes(role.uuid))
    .map((role) => role.title || role.name || 'Роль')

  // if (loading) {
  //   return (
  //     <>
  //       <AdminHeader title="Пользователи" />
  //       <main className="flex-1 overflow-y-auto">
  //         <div className="flex items-center justify-center py-12">
  //           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  //         </div>
  //       </main>
  //     </>
  //   )
  // }

  if (error) {
    return (
      <>
        <AdminHeader title="Пользователи" />
        <main className="flex-1 overflow-y-auto">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Пользователи" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Пользователи</h1>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={searchQuery || ''}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                  }
                }
                className="pl-10 w-[300px]"
              />
            </div>
            <Select
              value={selectedRole}
              onValueChange={(value) => {
                setSelectedRole(value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все роли" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.uuid} value={role.uuid}>
                    {role.title || role.name || 'Роль'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Select
                value={selectedKycStatus}
                onValueChange={(value) => {
                  setSelectedKycStatus(value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Все статусы KYC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы KYC</SelectItem>
                  <SelectItem value="pending">На проверке</SelectItem>
                  <SelectItem value="verified">Верифицирован</SelectItem>
                  <SelectItem value="rejected">Отклонён</SelectItem>
                  <SelectItem value="not_started">Не начата</SelectItem>
                </SelectContent>
              </Select>
              {kycPendingCount > 0 && selectedKycStatus === 'all' && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center px-1.5 text-xs"
                >
                  {kycPendingCount}
                </Badge>
              )}
            </div>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Добавить пользователя</SheetTitle>
                  <SheetDescription>
                    Заполните форму для создания нового пользователя
                  </SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                    <Label htmlFor="fullName">Полное имя</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      placeholder="Иван Иванов"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Пароль <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      placeholder="Минимум 8 символов"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Подтверждение пароля <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Повторите пароль"
                    />
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
                    {loadingRoles ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : roles.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Роли не найдены</p>
                    ) : (
                      <Popover open={rolesPopoverOpen} onOpenChange={setRolesPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            aria-expanded={rolesPopoverOpen}>
                            {selectedRolesLabels.length > 0
                              ? selectedRolesLabels.length === 1
                                ? selectedRolesLabels[0]
                                : `Выбрано: ${selectedRolesLabels.length}`
                              : 'Выберите роли'}
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
                                        handleRoleToggle(role.uuid)
                                      }}>
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          isSelected ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      {roleLabel}
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                    {formData.roleUuids.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {roles
                          .filter((role) => formData.roleUuids.includes(role.uuid))
                          .map((role) => {
                            const roleLabel = role.title || role.name || 'Роль'
                            return (
                              <Badge key={role.uuid} variant="secondary" className="text-xs">
                                {roleLabel}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRoleToggle(role.uuid)
                                  }}
                                  className="ml-2 hover:text-destructive cursor-pointer">
                                  ×
                                </button>
                              </Badge>
                            )
                          })}
                      </div>
                    )}
                  </div>

                  {formError && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      {formError}
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSheetOpen(false)
                        setFormData({
                          email: '',
                          password: '',
                          confirmPassword: '',
                          fullName: '',
                          emailVerified: false,
                          roleUuids: [],
                        })
                        setFormError(null)
                      }}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Создание...
                        </>
                      ) : (
                        'Создать'
                      )}
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Действия
                  <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSheetOpen(true)} className="cursor-pointer"> 
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить пользователя
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Массовые действия</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Пользователи</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 && !loading ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Нет пользователей
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedUsers.size === users.length && users.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Полное имя (email)</TableHead>
                      <TableHead>Human AID</TableHead>
                      <TableHead>Роли</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Верификация (KYC)</TableHead>
                      <TableHead>Дата регистрации</TableHead>
                      <TableHead>Дата подтверждения почты</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const kycStatus = getKycStatus(user)
                      const isKycPending = kycStatus === 'pending'
                      return (
                      <TableRow 
                        key={user.uuid}
                        className={cn(isKycPending && 'bg-[var(--primary-light)]')}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.uuid)}
                            onCheckedChange={(checked) =>
                              handleSelectUser(user.uuid, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.id}
                        </TableCell>
                        <TableCell>
                          {user.human?.fullName
                            ? `${user.human.fullName} (${user.email})`
                            : `(${user.email})`}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {user.humanAid || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <Badge
                                  key={role.uuid}
                                  variant={role.isSystem ? 'default' : 'outline'}
                                  className="text-xs">
                                  {role.title || role.name || 'Роль'}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? 'default' : 'destructive'}>
                            {user.isActive ? 'Активен' : 'Заблокирован'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {renderKycBadge(getKycStatus(user))}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : 'Не подтверждена'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/m/users/${user.uuid}`}>Редактировать</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/m/loans?search=${user.email}`}>
                                  Посмотреть Заявки
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/m/deals?search=${user.email}`}>
                                  Посмотреть Сделки
                                </Link>
                              </DropdownMenuItem>
                              {user.humanAid && user.emailVerifiedAt && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/m/users/${user.humanAid}/wallet`}>
                                    Перейти в кошелек
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleBlock(user.uuid)}
                                className="text-destructive">
                                Заблокировать
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {data && data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Показано {((data.pagination.page - 1) * data.pagination.limit) + 1} - {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} из {data.pagination.total}
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(data.pagination.page - 1)}
                            className={data.pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                          let pageNum: number | string
                          if (data.pagination.totalPages <= 5) {
                            pageNum = i + 1
                          } else if (data.pagination.page <= 3) {
                            pageNum = i + 1
                          } else if (data.pagination.page >= data.pagination.totalPages - 2) {
                            pageNum = data.pagination.totalPages - 4 + i
                          } else {
                            pageNum = data.pagination.page - 2 + i
                          }

                          if (pageNum < 1 || pageNum > data.pagination.totalPages) return null

                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => handlePageChange(pageNum as number)}
                                isActive={pageNum === data.pagination.page}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => handlePageChange(data.pagination.page + 1)}
                            className={data.pagination.page >= data.pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
    </>
  )
}


"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import qs from "qs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, MoreHorizontal, Loader2 } from "lucide-react"
import { altrpUser } from "@/shared/types/altrp"
import { DbPaginatedResult } from "@/shared/types/shared"
import debounce from "lodash/debounce"
import { cn } from "@/lib/utils"

interface UserWithRoles extends Omit<altrpUser, "human"> {
  roles?: Array<{
    uuid: string
    title: string | null
    name: string | null
    description: string | null
    isSystem: boolean | null
  }>
  human?: (altrpUser["human"] & {
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

export default function AdministratorUsersPage() {
  const searchParams = useSearchParams()
  const [data, setData] = React.useState<DbPaginatedResult<UserWithRoles> | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState(searchParams.get("search") || "")
  const [selectedRole, setSelectedRole] = React.useState<string>(searchParams.get("role") || "all")
  const [selectedKycStatus, setSelectedKycStatus] = React.useState<string>(
    searchParams.get("kycStatus") || "all"
  )
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("")
  const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set())
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
  })
  const [roles, setRoles] = React.useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = React.useState(false)

  React.useEffect(() => {
    const search = searchParams.get("search")
    const roleFilter = searchParams.get("role")
    const kycFilter = searchParams.get("kycStatus")

    setSearchQuery(search || "")
    setSelectedRole(roleFilter || "all")
    setSelectedKycStatus(kycFilter || "all")
  }, [searchParams])

  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true)
        const response = await fetch("/api/altrp/v1/admin/roles", {
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error("Failed to fetch roles")
        }

        const result = (await response.json()) as { docs?: Role[] }
        setRoles(result.docs || [])
      } catch (err) {
        console.error("Failed to fetch roles:", err)
        setRoles([])
      } finally {
        setLoadingRoles(false)
      }
    }

    fetchRoles()
  }, [])

  const debouncedSearch = React.useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedSearchQuery(value)
        setPagination((prev) => ({ ...prev, page: 1 }))
      }, 500),
    []
  )

  React.useEffect(() => {
    debouncedSearch(searchQuery)
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchQuery, debouncedSearch])

  const fetchUsers = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      }

      if (debouncedSearchQuery) {
        params.search = debouncedSearchQuery
      }

      if (selectedRole !== "all") {
        params.roles = selectedRole
      }

      if (selectedKycStatus !== "all") {
        params.kycStatus = selectedKycStatus
      }

      const queryString = qs.stringify(params, { arrayFormat: "repeat" })
      const response = await fetch(`/api/altrp/v1/admin/users?${queryString}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const result = (await response.json()) as DbPaginatedResult<UserWithRoles>
      setData(result)
    } catch (err) {
      console.error("Failed to fetch users:", err)
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearchQuery, selectedRole, selectedKycStatus])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(userId)
      } else {
        next.delete(userId)
      }
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (!data?.docs) return
    setSelectedUsers(checked ? new Set(data.docs.map((u) => u.uuid)) : new Set())
  }

  const getKycStatus = (user: UserWithRoles): string => {
    return user.human?.kycStatus || "not_started"
  }

  const users = data?.docs || []
  const totalPages = data?.pagination?.totalPages || 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Пользователи</h1>
        <p className="text-muted-foreground">Управление пользователями системы</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по email или имени..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Все роли" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.uuid} value={role.uuid}>
                    {role.title || role.name || "Без названия"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedKycStatus} onValueChange={setSelectedKycStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="KYC статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="not_started">Не начат</SelectItem>
                <SelectItem value="pending">Ожидает</SelectItem>
                <SelectItem value="approved">Одобрен</SelectItem>
                <SelectItem value="rejected">Отклонен</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Список пользователей</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={users.length > 0 && selectedUsers.size === users.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Human AID</TableHead>
                    <TableHead>Роли</TableHead>
                    <TableHead>KYC Статус</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const kycStatus = getKycStatus(user)
                    return (
                      <TableRow key={user.uuid}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.uuid)}
                            onCheckedChange={(checked) =>
                              handleSelectUser(user.uuid, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{user.id}</TableCell>
                        <TableCell>
                          {user.human?.fullName
                            ? `${user.human.fullName} (${user.email})`
                            : `(${user.email})`}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {user.humanAid || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles && user.roles.length > 0
                              ? user.roles.map((role) => (
                                  <Badge key={role.uuid} variant="secondary">
                                    {role.title || role.name || "Без названия"}
                                  </Badge>
                                ))
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              kycStatus === "approved"
                                ? "default"
                                : kycStatus === "rejected"
                                  ? "destructive"
                                  : kycStatus === "pending"
                                    ? "secondary"
                                    : "outline"
                            }
                          >
                            {kycStatus === "approved"
                              ? "Одобрен"
                              : kycStatus === "rejected"
                                ? "Отклонен"
                                : kycStatus === "pending"
                                  ? "Ожидает"
                                  : "Не начат"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Действия</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Просмотр</DropdownMenuItem>
                              <DropdownMenuItem>Редактировать</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                    }
                    className={cn(pagination.page === 1 && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setPagination((prev) => ({ ...prev, page }))}
                      isActive={pagination.page === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.min(totalPages, prev.page + 1),
                      }))
                    }
                    className={cn(
                      pagination.page === totalPages && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  )
}

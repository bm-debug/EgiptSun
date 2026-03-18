'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  closestCorners,
} from '@dnd-kit/core'
import {
  useDroppable,
} from '@dnd-kit/core'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Loader2,
  Plus,
  GripVertical,
  Pencil,
  Image as ImageIcon,
  X,
  Send,
  Trash2,
  Table2,
  LayoutGrid,
} from 'lucide-react'
import { AdminHeader } from '@/packages/components/blocks-app/app-admin/AdminHeader'
import Link from 'next/link'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRoomSocket } from '@/hooks/use-user-socket'
import type { altrpSupportMessage } from '@/shared/types/altrp-support'
import { CurrentUser, TaskApi, TaskAssignee, TaskPriority, TaskStatus } from '@/shared/types/tasks'

type Task = TaskApi & { id: string; date: string }

const statusColumns = [
  { id: 'todo', title: 'К выполнению' },
  { id: 'in-progress', title: 'В работе' },
  { id: 'done', title: 'Выполнено' },
]

const mapApiTask = (task: TaskApi): Task => ({
  id: task.uuid,
  uuid: task.uuid,
  title: task.title,
  clientLink: task.clientLink || '',
  priority: task.priority || 'medium',
  taskThreadMaid: (task as any).taskThreadMaid,
  assignee: {
    uuid: task.assignee?.uuid,
    name: task.assignee?.name || 'Не назначен',
    avatar: task.assignee?.avatar ?? null,
  },
  date: task.updatedAt || task.createdAt || new Date().toISOString(),
  status: task.status || 'todo',
})

const assigneeKey = (assignee: TaskAssignee): string => assignee.uuid || assignee.name

const getPriorityVariant = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'destructive'
    case 'medium':
      return 'secondary'
    case 'low':
      return 'outline'
    default:
      return 'outline'
  }
}

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'Высокий'
    case 'medium':
      return 'Средний'
    case 'low':
      return 'Низкий'
    default:
      return priority
  }
}

function DroppableColumn({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[300px] rounded-lg border-2 p-4 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : 'border-border'
      }`}>
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-3 min-h-[200px]">
        {children}
      </div>
    </div>
  )
}

function DraggableTask({
  task,
  onEdit,
  onDelete,
}: {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-move hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{task.title}</CardTitle>
          <div className="flex items-center gap-1">
            {onEdit ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onEdit(task)
                  }}
                  aria-label="Редактировать задачу">
                  <Pencil className="h-4 w-4" />
                </Button>
                {onDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDelete(task)
                    }}
                    aria-label="Удалить задачу">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ) : null}
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        <CardDescription className="text-xs">
          <Link href={task.clientLink || '#'} className="text-primary hover:underline">
            {task.clientLink}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant={getPriorityVariant(task.priority)} className="text-xs">
            {getPriorityLabel(task.priority)}
          </Badge>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.avatar || undefined} alt={task.assignee.name} />
              <AvatarFallback className="text-xs">
                {task.assignee.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(task.date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </CardContent>
    </Card>
  )
}

export default function AdminTasksPageClient() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)
  const [pageError, setPageError] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)
  const [assignees, setAssignees] = React.useState<TaskAssignee[]>([])
  const [managerFilter, setManagerFilter] = React.useState<string>('all')
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'kanban' | 'table'>('kanban')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = React.useState(false)
  const [taskMessages, setTaskMessages] = React.useState<altrpSupportMessage[]>([])
  const [taskMessagesPage, setTaskMessagesPage] = React.useState(1)
  const [taskMessagesHasMore, setTaskMessagesHasMore] = React.useState(true)
  const [loadingTaskMessages, setLoadingTaskMessages] = React.useState(false)
  const [sendingTaskMessage, setSendingTaskMessage] = React.useState(false)
  const [taskMessageContent, setTaskMessageContent] = React.useState('')
  const [taskMessageFile, setTaskMessageFile] = React.useState<File | null>(null)
  const [taskMessageFilePreview, setTaskMessageFilePreview] = React.useState<string | null>(null)
  const [currentThreadMaid, setCurrentThreadMaid] = React.useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingTaskId, setDeletingTaskId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [createFirstMessage, setCreateFirstMessage] = React.useState('')
  const [formData, setFormData] = React.useState({
    title: '',
    clientLink: '',
    priority: 'medium' as TaskPriority,
    assigneeUuid: '',
    status: 'todo' as TaskStatus,
  })
  const [editFormData, setEditFormData] = React.useState({
    title: '',
    clientLink: '',
    priority: 'medium' as TaskPriority,
    assigneeUuid: '',
    status: 'todo' as TaskStatus,
  })
  const latestMessageTimestampRef = React.useRef<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  )

  React.useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true)
        setPageError(null)
        setActionError(null)

        const meResponse = await fetch('/api/auth/me', { credentials: 'include' })
        if (!meResponse.ok) {
          throw new Error('Не удалось загрузить пользователя')
        }
        const meData = (await meResponse.json()) as {
          user: { uuid: string; name?: string; email?: string; roles?: { name?: string }[] }
        }
        const roles = meData.user.roles || []
        const isAdmin = roles.some((role) => role?.name === 'Administrator' || role?.name === 'admin')
        const me: CurrentUser = {
          uuid: meData.user.uuid,
          name: meData.user.name || meData.user.email || 'Пользователь',
          roles,
          isAdmin,
          humanAid: (meData.user as any).humanAid || null,
        }
        setCurrentUser(me)
        if (!isAdmin) {
          setManagerFilter(me.uuid)
          setFormData((prev) => ({ ...prev, assigneeUuid: prev.assigneeUuid || me.uuid }))
        }

        const [tasksResponse, assigneesResponse] = await Promise.all([
          fetch('/api/altrp/v1/admin/tasks', { credentials: 'include' }),
          fetch('/api/altrp/v1/admin/tasks/assignees', { credentials: 'include' }),
        ])

        const tasksPayload = await tasksResponse.json().catch(() => null)
        const assigneesPayload = await assigneesResponse.json().catch(() => null)

        if (!tasksResponse.ok) {
          const message =
            (tasksPayload as { message?: string })?.message || 'Не удалось загрузить задачи'
          throw new Error(message)
        }

        if (assigneesResponse.ok && (assigneesPayload as { assignees?: TaskAssignee[] }).assignees) {
          const apiAssignees = (assigneesPayload as { assignees: TaskAssignee[] }).assignees
          const merged = [...apiAssignees]
          if (!merged.some((a) => a.uuid === me.uuid)) {
            merged.push({ uuid: me.uuid, name: me.name })
          }
          setAssignees(merged)
          if (isAdmin) {
            setFormData((prev) => ({
              ...prev,
              assigneeUuid: prev.assigneeUuid || merged[0]?.uuid || me.uuid,
            }))
          }
        } else {
          setAssignees([{ uuid: me.uuid, name: me.name }])
        }

        const payload = tasksPayload as { tasks?: TaskApi[] }
        setTasks((payload.tasks || []).map(mapApiTask))
      } catch (err) {
        console.error('Tasks fetch error:', err)
        setPageError(err instanceof Error ? err.message : 'Не удалось загрузить задачи')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  React.useEffect(() => {
    if (currentUser && !formData.assigneeUuid) {
      setFormData((prev) => ({ ...prev, assigneeUuid: currentUser.uuid }))
    }
  }, [currentUser, formData.assigneeUuid])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const taskId = active.id as string
    const newStatus = over.id as string

    if (statusColumns.some((col) => col.id === newStatus)) {
      const previousTasks = tasks
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus as Task['status'] } : task
        )
      )

      try {
        setActionError(null)
        const response = await fetch(`/api/altrp/v1/admin/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: newStatus }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          const message =
            (payload as { message?: string; error?: string })?.message ||
            (payload as { message?: string; error?: string })?.error ||
            'Не удалось обновить статус задачи'
          throw new Error(message)
        }
        if ((payload as { task?: TaskApi }).task) {
          setTasks((prev) =>
            prev.map((task) =>
              task.id === taskId ? mapApiTask((payload as { task: TaskApi }).task) : task
            )
          )
        }
      } catch (err) {
        console.error('Task update error:', err)
        setActionError(err instanceof Error ? err.message : 'Не удалось обновить статус задачи')
        setTasks(previousTasks)
      }
    }

    setActiveId(null)
  }

  const assigneeOptions = React.useMemo(() => {
    const map = new Map<string, TaskAssignee>()
    assignees.forEach((assignee) => {
      const key = assigneeKey(assignee)
      if (!map.has(key)) {
        map.set(key, assignee)
      }
    })
    if (currentUser) {
      const key = currentUser.uuid || currentUser.name
      if (!map.has(key)) {
        map.set(key, { uuid: currentUser.uuid, name: currentUser.name })
      }
    }
    return Array.from(map.values())
  }, [assignees, currentUser])

  const filteredTasks = tasks.filter((task) => {
    if (managerFilter === 'all') return true
    return assigneeKey(task.assignee) === managerFilter
  })

  const tasksByStatus = {
    todo: filteredTasks.filter((task) => task.status === 'todo'),
    'in-progress': filteredTasks.filter((task) => task.status === 'in-progress'),
    done: filteredTasks.filter((task) => task.status === 'done'),
  }

  const activeTask = tasks.find((task) => task.id === activeId)

  const markTaskMessagesViewed = React.useCallback(
    async (taskId: string) => {
      try {
        await fetch(`/api/altrp/v1/admin/tasks/${taskId}/messages/view`, {
          method: 'POST',
          credentials: 'include',
        })
      } catch (err) {
        console.error('Mark task messages viewed error:', err)
      }
    },
    []
  )

  const loadTaskMessages = React.useCallback(
    async (taskId: string, threadMaid: string, page = 1, append = false) => {
      try {
        setLoadingTaskMessages(true)
        const response = await fetch(
          `/api/altrp/v1/admin/tasks/${taskId}/messages?page=${page}&limit=20`,
          { credentials: 'include' }
        )
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          const message =
            (payload as { message?: string; error?: string })?.message ||
            (payload as { message?: string; error?: string })?.error ||
            'Не удалось загрузить сообщения'
          throw new Error(message)
        }
        const data = (payload as any)?.data
        const messages = (data?.messages as altrpSupportMessage[]) || []
        const ordered = [...messages].reverse()

        setTaskMessages((prev) => (append ? [...ordered, ...prev] : ordered))
        setTaskMessagesHasMore(Boolean(data?.pagination?.hasMore))
        setTaskMessagesPage(page)
        const latest = ordered[ordered.length - 1]
        if (latest?.createdAt) {
          latestMessageTimestampRef.current =
            latest.createdAt instanceof Date
              ? latest.createdAt.toISOString()
              : String(latest.createdAt)
        }
        await markTaskMessagesViewed(taskId)
      } catch (err) {
        console.error('Task messages fetch error:', err)
        setActionError(err instanceof Error ? err.message : 'Не удалось загрузить сообщения')
      } finally {
        setLoadingTaskMessages(false)
      }
    },
    [markTaskMessagesViewed]
  )

  const loadNewTaskMessages = React.useCallback(async () => {
    if (!editingTaskId || !currentThreadMaid || !latestMessageTimestampRef.current) return
    try {
      const response = await fetch(
        `/api/altrp/v1/admin/tasks/${editingTaskId}/messages/new?after=${encodeURIComponent(
          latestMessageTimestampRef.current
        )}`,
        { credentials: 'include' }
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) return
      const newMessages = ((payload as any)?.data?.messages || []) as altrpSupportMessage[]
      if (newMessages.length === 0) return
      const ordered = [...newMessages].reverse()
      setTaskMessages((prev) => {
        const existing = new Set(prev.map((m) => m.uuid))
        const merged = [...prev, ...ordered.filter((m) => !existing.has(m.uuid))]
        const latest = merged[merged.length - 1]
        if (latest?.createdAt) {
          latestMessageTimestampRef.current =
            latest.createdAt instanceof Date
              ? latest.createdAt.toISOString()
              : String(latest.createdAt)
        }
        return merged
      })
      await markTaskMessagesViewed(editingTaskId)
    } catch (err) {
      console.error('Task messages new fetch error:', err)
    }
  }, [currentThreadMaid, editingTaskId, markTaskMessagesViewed])

  useRoomSocket(
    currentThreadMaid ? `task:${currentThreadMaid}` : '',
    {
      'new-message': () => {
        void loadNewTaskMessages()
      },
    }
  )

  const handleOpenEdit = (task: Task) => {
    setActionError(null)
    setEditingTaskId(task.id)
    setCurrentThreadMaid(task.taskThreadMaid || null)
    setEditFormData({
      title: task.title || '',
      clientLink: task.clientLink || '',
      priority: task.priority || 'medium',
      assigneeUuid: assigneeKey(task.assignee),
      status: task.status || 'todo',
    })
    setEditDialogOpen(true)
    setTaskMessages([])
    setTaskMessagesPage(1)
    setTaskMessagesHasMore(true)
    if (task.taskThreadMaid) {
      void loadTaskMessages(task.id, task.taskThreadMaid, 1, false)
    }
  }

  const handleOpenDelete = (task: Task) => {
    setDeletingTaskId(task.id)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingTaskId) return
    try {
      setDeleting(true)
      setActionError(null)
      const response = await fetch(`/api/altrp/v1/admin/tasks/${deletingTaskId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          (payload as { message?: string; error?: string })?.message ||
          (payload as { message?: string; error?: string })?.error ||
          'Не удалось удалить задачу'
        throw new Error(message)
      }
      setTasks((prev) => prev.filter((t) => t.id !== deletingTaskId))
      setDeleteDialogOpen(false)
      setDeletingTaskId(null)
    } catch (err) {
      console.error('Delete task error:', err)
      setActionError(err instanceof Error ? err.message : 'Не удалось удалить задачу')
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setActionError('Не удалось определить пользователя')
      return
    }
    try {
      setSubmitting(true)
      setActionError(null)

      const selectedAssignee = assigneeOptions.find(
        (option) => assigneeKey(option) === (formData.assigneeUuid || currentUser.uuid)
      )
      const assigneeUuid = currentUser.isAdmin
        ? selectedAssignee?.uuid || currentUser.uuid
        : currentUser.uuid

      const response = await fetch('/api/altrp/v1/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          clientLink: formData.clientLink || undefined,
          priority: formData.priority,
          status: formData.status,
          assigneeUuid,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          (payload as { message?: string; error?: string })?.message ||
          (payload as { message?: string; error?: string })?.error ||
          'Не удалось создать задачу'
        throw new Error(message)
      }

      if ((payload as { task?: TaskApi }).task) {
        const created = mapApiTask((payload as { task: TaskApi }).task)
        setTasks((prev) => [...prev, created])

        // отправим первое сообщение, если есть текст
        if (createFirstMessage.trim() && created.taskThreadMaid) {
          try {
            const fd = new FormData()
            fd.append('messageType', 'text')
            fd.append('content', createFirstMessage.trim())
            const msgResponse = await fetch(
              `/api/altrp/v1/admin/tasks/${created.id}/messages`,
              {
                method: 'POST',
                credentials: 'include',
                body: fd,
              }
            )
            const msgPayload = await msgResponse.json().catch(() => null)
            if (!msgResponse.ok) {
              const message =
                (msgPayload as { message?: string; error?: string })?.message ||
                (msgPayload as { message?: string; error?: string })?.error ||
                'Не удалось отправить первое сообщение'
              throw new Error(message)
            }
          } catch (msgErr) {
            console.error('Create first message error:', msgErr)
            setActionError(
              msgErr instanceof Error ? msgErr.message : 'Не удалось отправить первое сообщение'
            )
          }
        }
      }
      setFormData({
        title: '',
        clientLink: '',
        priority: 'medium',
        assigneeUuid: currentUser.uuid,
        status: 'todo',
      })
      setCreateFirstMessage('')
      setDialogOpen(false)
    } catch (err) {
      console.error('Create task error:', err)
      setActionError(err instanceof Error ? err.message : 'Не удалось создать задачу')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      setActionError('Не удалось определить пользователя')
      return
    }
    if (!editingTaskId) {
      setActionError('Не удалось определить задачу для редактирования')
      return
    }

    try {
      setEditSubmitting(true)
      setActionError(null)

      const selectedAssignee = assigneeOptions.find(
        (option) => assigneeKey(option) === (editFormData.assigneeUuid || currentUser.uuid)
      )
      const assigneeUuid = currentUser.isAdmin
        ? selectedAssignee?.uuid || currentUser.uuid
        : currentUser.uuid

      const response = await fetch(`/api/altrp/v1/admin/tasks/${editingTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: editFormData.title,
          clientLink: editFormData.clientLink || '',
          priority: editFormData.priority,
          status: editFormData.status,
          assigneeUuid,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          (payload as { message?: string; error?: string })?.message ||
          (payload as { message?: string; error?: string })?.error ||
          'Не удалось обновить задачу'
        throw new Error(message)
      }

      if ((payload as { task?: TaskApi }).task) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === editingTaskId ? mapApiTask((payload as { task: TaskApi }).task) : task
          )
        )
      }

      setEditDialogOpen(false)
      setEditingTaskId(null)
    } catch (err) {
      console.error('Update task error:', err)
      setActionError(err instanceof Error ? err.message : 'Не удалось обновить задачу')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleTaskFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(file.type)) {
      setActionError('Разрешены только изображения (JPG, PNG, WebP)')
      return
    }
    setTaskMessageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setTaskMessageFilePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveTaskFile = () => {
    setTaskMessageFile(null)
    setTaskMessageFilePreview(null)
  }

  const handleSendTaskMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault()
    if (!editingTaskId || !currentThreadMaid) {
      setActionError('Не выбрана задача для отправки сообщения')
      return
    }
    if (!taskMessageContent.trim() && !taskMessageFile) {
      setActionError('Введите сообщение или выберите файл')
      return
    }
    try {
      setSendingTaskMessage(true)
      setActionError(null)

      const formData = new FormData()
      formData.append('messageType', taskMessageFile ? 'photo' : 'text')
      if (taskMessageContent.trim()) {
        formData.append('content', taskMessageContent.trim())
      }
      if (taskMessageFile) {
        formData.append('file', taskMessageFile)
      }

      const response = await fetch(`/api/altrp/v1/admin/tasks/${editingTaskId}/messages`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          (payload as { message?: string; error?: string })?.message ||
          (payload as { message?: string; error?: string })?.error ||
          'Не удалось отправить сообщение'
        throw new Error(message)
      }

      await loadTaskMessages(editingTaskId, currentThreadMaid, 1, false)
      setTaskMessageContent('')
      setTaskMessageFile(null)
      setTaskMessageFilePreview(null)
    } catch (err) {
      console.error('Send task message error:', err)
      setActionError(err instanceof Error ? err.message : 'Не удалось отправить сообщение')
    } finally {
      setSendingTaskMessage(false)
    }
  }

  const handleTaskMessagePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardItems = e.clipboardData?.items
    if (!clipboardItems || clipboardItems.length === 0) return

    const fileItem = Array.from(clipboardItems).find(
      (item) => item.kind === 'file' && item.type.startsWith('image/')
    )
    if (!fileItem) return

    const file = fileItem.getAsFile()
    if (!file) return

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(file.type)) {
      setActionError('Разрешены только изображения (JPG, PNG, WebP)')
      return
    }

    e.preventDefault()
    setTaskMessageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setTaskMessageFilePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleTaskMessageKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
      void handleSendTaskMessage(e)
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Менеджер задач" />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    )
  }

  if (pageError) {
    return (
      <>
        <AdminHeader title="Менеджер задач" />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{pageError}</p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Менеджер задач" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
        {actionError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{actionError}</p>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Менеджер задач</h1>
          <div className="flex gap-2">
            <Select value={managerFilter} onValueChange={setManagerFilter} disabled={!currentUser?.isAdmin}>
              <SelectTrigger className="w-[200px]" disabled={!currentUser?.isAdmin}>
                <SelectValue placeholder="Ответственный" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {assigneeOptions.map((manager) => (
                  <SelectItem key={assigneeKey(manager)} value={assigneeKey(manager)}>
                    {manager.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open)
                if (open) setActionError(null)
              }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Создать задачу
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Создать новую задачу</DialogTitle>
                  <DialogDescription>
                    Заполните форму для создания новой задачи
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Название задачи *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Введите название задачи"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientLink">Ссылка на заявку</Label>
                    <Input
                      id="clientLink"
                      value={formData.clientLink}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, clientLink: e.target.value }))
                      }
                      placeholder="/m/deals/deal-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Приоритет *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') =>
                        setFormData((prev) => ({ ...prev, priority: value }))
                      }>
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Низкий</SelectItem>
                        <SelectItem value="medium">Средний</SelectItem>
                        <SelectItem value="high">Высокий</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignee">Ответственный *</Label>
                    <Select
                      value={formData.assigneeUuid}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, assigneeUuid: value }))
                      }
                      disabled={currentUser ? !currentUser.isAdmin : false}>
                      <SelectTrigger id="assignee">
                        <SelectValue placeholder="Выберите ответственного" />
                      </SelectTrigger>
                      <SelectContent>
                        {assigneeOptions.map((manager) => (
                          <SelectItem key={assigneeKey(manager)} value={assigneeKey(manager)}>
                            {manager.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Статус *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'todo' | 'in-progress' | 'done') =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">К выполнению</SelectItem>
                        <SelectItem value="in-progress">В работе</SelectItem>
                        <SelectItem value="done">Выполнено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="first-message">Первое сообщение (опционально)</Label>
                    <Textarea
                      id="first-message"
                      value={createFirstMessage}
                      onChange={(e) => setCreateFirstMessage(e.target.value)}
                      placeholder="Текст будет отправлен как первое сообщение в чате задачи"
                      rows={3}
                    />
                  </div>

                  {actionError && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                      <p className="text-sm text-destructive">{actionError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={submitting}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Создание...
                        </>
                      ) : (
                        'Создать задачу'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={(open) => {
              setEditDialogOpen(open)
              if (!open) {
                setEditingTaskId(null)
              }
            }}>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Редактировать задачу</DialogTitle>
                  <DialogDescription>
                    Измените поля и сохраните изменения
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleUpdateTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Название задачи *</Label>
                    <Input
                      id="edit-title"
                      value={editFormData.title}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Введите название задачи"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-clientLink">Ссылка на заявку</Label>
                    <Input
                      id="edit-clientLink"
                      value={editFormData.clientLink}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, clientLink: e.target.value }))
                      }
                      placeholder="/m/deals/deal-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-priority">Приоритет *</Label>
                    <Select
                      value={editFormData.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') =>
                        setEditFormData((prev) => ({ ...prev, priority: value }))
                      }>
                      <SelectTrigger id="edit-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Низкий</SelectItem>
                        <SelectItem value="medium">Средний</SelectItem>
                        <SelectItem value="high">Высокий</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-assignee">Ответственный *</Label>
                    <Select
                      value={editFormData.assigneeUuid}
                      onValueChange={(value) =>
                        setEditFormData((prev) => ({ ...prev, assigneeUuid: value }))
                      }
                      disabled={currentUser ? !currentUser.isAdmin : false}>
                      <SelectTrigger id="edit-assignee">
                        <SelectValue placeholder="Выберите ответственного" />
                      </SelectTrigger>
                      <SelectContent>
                        {assigneeOptions.map((manager) => (
                          <SelectItem key={assigneeKey(manager)} value={assigneeKey(manager)}>
                            {manager.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Статус *</Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(value: 'todo' | 'in-progress' | 'done') =>
                        setEditFormData((prev) => ({ ...prev, status: value }))
                      }>
                      <SelectTrigger id="edit-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">К выполнению</SelectItem>
                        <SelectItem value="in-progress">В работе</SelectItem>
                        <SelectItem value="done">Выполнено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Сообщения по задаче</h4>
                      {loadingTaskMessages && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                      {taskMessages.length === 0 && !loadingTaskMessages ? (
                        <p className="text-sm text-muted-foreground">Сообщений пока нет</p>
                      ) : (
                        taskMessages.map((msg) => {
                          const dataIn = msg.dataIn as any
                          const isMine =
                            currentUser?.humanAid && dataIn?.humanHaid
                              ? currentUser.humanAid === dataIn.humanHaid
                              : false
                          const mediaUrl = dataIn?.mediaUrl
                          const messageType = dataIn?.messageType
                          return (
                            <div
                              key={msg.uuid}
                              className={`rounded-lg border p-3 ${
                                isMine ? 'bg-muted/60' : 'bg-background'
                              }`}>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{dataIn?.humanHaid || 'Участник'}</span>
                                <span>
                                  {msg.createdAt
                                    ? new Date(msg.createdAt).toLocaleString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : ''}
                                </span>
                              </div>
                              <div className="mt-2 text-sm whitespace-pre-wrap">
                                {dataIn?.content}
                              </div>
                          {messageType === 'photo' && (mediaUrl || dataIn?.mediaUuid) ? (
                            <div className="mt-2">
                              <a
                                href={mediaUrl || `/api/altrp/v1/media/${dataIn?.mediaUuid}`}
                                target="_blank"
                                rel="noreferrer">
                                <img
                                  src={mediaUrl || `/api/altrp/v1/media/${dataIn?.mediaUuid}`}
                                  alt="Вложение"
                                  className="max-h-48 rounded border object-contain"
                                />
                              </a>
                            </div>
                          ) : null}
                            </div>
                          )
                        })
                      )}
                    </div>

                    {currentThreadMaid && taskMessagesHasMore ? (
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            loadTaskMessages(
                              editingTaskId!,
                              currentThreadMaid,
                              taskMessagesPage + 1,
                              true
                            )
                          }
                          disabled={loadingTaskMessages}>
                          Загрузить ещё
                        </Button>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      {taskMessageFilePreview && (
                        <div className="relative inline-block">
                          <img
                            src={taskMessageFilePreview}
                            alt="Preview"
                            className="max-h-32 rounded-md"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute -right-2 -top-2 h-6 w-6"
                            onClick={handleRemoveTaskFile}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <Textarea
                        value={taskMessageContent}
                        onChange={(e) => setTaskMessageContent(e.target.value)}
                        placeholder="Введите сообщение..."
                        rows={3}
                        onPaste={handleTaskMessagePaste}
                        onKeyDown={handleTaskMessageKeyDown}
                        disabled={sendingTaskMessage}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          id="task-message-file"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={handleTaskFileSelect}
                          disabled={sendingTaskMessage}
                        />
                        <Label
                          htmlFor="task-message-file"
                          className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                          <ImageIcon className="h-4 w-4" />
                          Вложить
                        </Label>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSendTaskMessage}
                          disabled={sendingTaskMessage || (!taskMessageContent.trim() && !taskMessageFile)}>
                          {sendingTaskMessage ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Отправка...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Отправить
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {actionError && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                      <p className="text-sm text-destructive">{actionError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditDialogOpen(false)}
                      disabled={editSubmitting}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={editSubmitting}>
                      {editSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        'Сохранить'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog
              open={deleteDialogOpen}
              onOpenChange={(open) => {
                setDeleteDialogOpen(open)
                if (!open) {
                  setDeletingTaskId(null)
                }
              }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Удалить задачу?</DialogTitle>
                  <DialogDescription>
                    Действие нельзя отменить. Задача будет скрыта из списка.
                  </DialogDescription>
                </DialogHeader>
                {actionError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {actionError}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                    Отмена
                  </Button>
                  <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
                    {deleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Удаление...
                      </>
                    ) : (
                      'Удалить'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'kanban' | 'table')}>
          <TabsList className="mb-4">
            <TabsTrigger value="kanban">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Канбан
            </TabsTrigger>
            <TabsTrigger value="table">
              <Table2 className="h-4 w-4 mr-2" />
              Таблица
            </TabsTrigger>
          </TabsList>
          <TabsContent value="kanban" className="mt-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto">
                {statusColumns.map((column) => (
                  <DroppableColumn key={column.id} id={column.id} title={column.title}>
                    {tasksByStatus[column.id as keyof typeof tasksByStatus].map((task) => (
                      <DraggableTask key={task.id} task={task} onEdit={handleOpenEdit} onDelete={handleOpenDelete} />
                    ))}
                  </DroppableColumn>
                ))}
              </div>
              <DragOverlay>
                {activeTask ? <DraggableTask task={activeTask} /> : null}
              </DragOverlay>
            </DndContext>
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Приоритет</TableHead>
                    <TableHead>Ответственный</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Ссылка</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Задач не найдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(task.priority)} className="text-xs">
                            {getPriorityLabel(task.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.assignee.avatar || undefined} alt={task.assignee.name} />
                              <AvatarFallback className="text-xs">
                                {task.assignee.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{task.assignee.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {statusColumns.find((col) => col.id === task.status)?.title || task.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(task.date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          {task.clientLink ? (
                            <Link href={task.clientLink} className="text-primary hover:underline text-sm">
                              {task.clientLink}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(task)}
                              aria-label="Редактировать задачу">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleOpenDelete(task)}
                              aria-label="Удалить задачу">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </>
  )
}


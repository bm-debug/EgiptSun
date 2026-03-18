"use client"

import * as React from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/packages/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GripVertical, Plus, Trash2, Star, FileText, List, Paperclip } from "lucide-react"
import type { QuestionnaireItem } from "./CampaignWizard"

interface QuestionnaireBuilderProps {
  items: QuestionnaireItem[]
  onChange: (items: QuestionnaireItem[]) => void
}

interface QuestionItemProps {
  item: QuestionnaireItem
  onUpdate: (id: string, updates: Partial<QuestionnaireItem>) => void
  onDelete: (id: string) => void
}

function QuestionItem({ item, onUpdate, onDelete }: QuestionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card ref={setNodeRef} style={style} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.type === "star_rating" && <Star className="h-4 w-4" />}
                {item.type === "text_area" && <FileText className="h-4 w-4" />}
                {item.type === "single_choice" && <List className="h-4 w-4" />}
                {item.type === "attachment" && <Paperclip className="h-4 w-4" />}
                <span className="text-sm font-medium capitalize">
                  {item.type.replace("_", " ")}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onDelete(item.id)}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`question-${item.id}`}>Вопрос</Label>
              <Input
                id={`question-${item.id}`}
                value={item.question}
                onChange={(e) => onUpdate(item.id, { question: e.target.value })}
                placeholder="Введите ваш вопрос"
              />
            </div>

            {item.type === "single_choice" && (
              <div className="grid gap-2">
                <Label>Варианты ответа</Label>
                <div className="space-y-2">
                  {item.options?.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(item.options || [])]
                          newOptions[index] = e.target.value
                          onUpdate(item.id, { options: newOptions })
                        }}
                        placeholder={`Вариант ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newOptions = item.options?.filter((_, i) => i !== index) || []
                          onUpdate(item.id, { options: newOptions })
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newOptions = [...(item.options || []), ""]
                      onUpdate(item.id, { options: newOptions })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить вариант
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id={`required-${item.id}`}
                checked={item.required}
                onCheckedChange={(checked) =>
                  onUpdate(item.id, { required: checked === true })
                }
              />
              <Label htmlFor={`required-${item.id}`} className="cursor-pointer">
                Обязательное поле
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

export function QuestionnaireBuilder({ items, onChange }: QuestionnaireBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index,
      }))

      onChange(newItems)
    }
  }

  const handleAddQuestion = (type: QuestionnaireItem["type"]) => {
    const newItem: QuestionnaireItem = {
      id: crypto.randomUUID(),
      type,
      question: "",
      required: type === "attachment", // Attachment is always required
      order: items.length,
      ...(type === "single_choice" ? { options: [] } : {}),
    }
    onChange([...items, newItem])
  }

  const handleUpdate = (id: string, updates: Partial<QuestionnaireItem>) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const handleDelete = (id: string) => {
    const newItems = items
      .filter((item) => item.id !== id)
      .map((item, index) => ({ ...item, order: index }))
    onChange(newItems)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Конструктор анкеты</h3>
          <p className="text-sm text-muted-foreground">
            Соберите форму отчета, которую будет заполнять тестер
          </p>
        </div>
        <Select
          onValueChange={(value: QuestionnaireItem["type"]) => handleAddQuestion(value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Добавить вопрос" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="star_rating">
              Оценка 1-5
            </SelectItem>
            <SelectItem value="text_area">
              Развернутый ответ
            </SelectItem>
            <SelectItem value="single_choice">
              Выбор одного из списка
            </SelectItem>
            <SelectItem value="attachment">
              Требование скриншота/лога
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Вопросы еще не добавлены</p>
            <p className="text-sm text-muted-foreground text-center">
              Нажмите "Добавить вопрос" выше, чтобы начать создавать анкету
            </p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {items.map((item) => (
                <QuestionItem
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

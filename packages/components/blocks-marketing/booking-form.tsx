"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  duration: string;
  price: number;
  category: "massage" | "spa";
}

const SERVICES: Service[] = [
  // Спа программы (по убыванию цены)
  { id: "s4", name: "Египетская СПА программа Бастет леди", duration: "180 мин.", price: 8900, category: "spa" },
  { id: "s1", name: "Египетская СПА программа Клеопатра", duration: "150 мин.", price: 7500, category: "spa" },
  { id: "s2", name: "Египетская СПА программа Солнце Египта", duration: "120 мин.", price: 5900, category: "spa" },
  { id: "s3", name: "Египетская СПА программа Нефертити", duration: "90 мин.", price: 4900, category: "spa" },
  // Массаж (по убыванию цены)
  { id: "m3b", name: "Египетский массаж тела", duration: "90 мин.", price: 4900, category: "massage" },
  { id: "m3a", name: "Египетский массаж тела", duration: "60 мин.", price: 3500, category: "massage" },
  { id: "m4", name: "Египетский массаж лица", duration: "40 мин.", price: 2900, category: "massage" },
  { id: "m5", name: "Египетский массаж спины", duration: "40 мин.", price: 2500, category: "massage" },
  { id: "m2", name: "Египетский массаж ног и ступней", duration: "40 мин.", price: 2500, category: "massage" },
  { id: "m1", name: "Египетский массаж головы", duration: "30 мин.", price: 1900, category: "massage" },
  { id: "m6", name: "Египетский массаж шейно-воротниковой зоны", duration: "30 мин.", price: 1900, category: "massage" },
];

interface BookingFormProps {
  className?: string;
}

export function BookingForm({ className }: BookingFormProps) {
  const [selectedService, setSelectedService] = useState<string>("");
  const [dateTime, setDateTime] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    comments: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedServiceData = SERVICES.find(s => s.id === selectedService);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Здесь будет логика отправки на сервер
    console.log("Booking submitted:", {
      service: selectedServiceData,
      dateTime,
      ...formData,
    });

    // Имитация отправки
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className={cn("w-full max-w-2xl mx-auto", className)}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Заявка отправлена!</CardTitle>
          <CardDescription>
            Мы свяжемся с вами в ближайшее время для подтверждения записи
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="text-2xl">Запись на процедуру</CardTitle>
        <CardDescription>
          Выберите услугу и удобное время для посещения
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Выбор услуги */}
          <div className="space-y-2">
            <Label htmlFor="service">Услуга *</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger id="service" className="w-full">
                <SelectValue placeholder="Выберите услугу" />
              </SelectTrigger>
              <SelectContent>
                <optgroup label="СПА программы">
                  {SERVICES.filter(s => s.category === "spa").map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {service.duration} ({service.price} ₽)
                    </SelectItem>
                  ))}
                </optgroup>
                <optgroup label="Массаж">
                  {SERVICES.filter(s => s.category === "massage").map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {service.duration} ({service.price} ₽)
                    </SelectItem>
                  ))}
                </optgroup>
              </SelectContent>
            </Select>
          </div>

          {/* Выбор даты и времени */}
          <div className="space-y-2">
            <Label htmlFor="datetime">Дата и время *</Label>
            <DateTimePicker
              mode="datetime"
              value={dateTime}
              onChange={setDateTime}
              placeholder="Выберите дату и время"
              dateFormat="dd.MM.yyyy"
              timeFormat="HH:mm"
              fromDate={new Date()}
              className="w-full"
            />
          </div>

          {/* Контактные данные */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ваше имя *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Иван Иванов"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="example@email.com"
              />
            </div>
          </div>

          {/* Комментарии */}
          <div className="space-y-2">
            <Label htmlFor="comments">Комментарии</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) => handleInputChange("comments", e.target.value)}
              placeholder="Пожелания, особенности здоровья и т.д."
              className="min-h-[100px]"
            />
          </div>

          {/* Итого */}
          {selectedServiceData && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Услуга:</span>
                <span className="font-medium">{selectedServiceData.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Продолжительность:</span>
                <span className="font-medium">{selectedServiceData.duration}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t">
                <span className="font-semibold">Стоимость:</span>
                <span className="font-bold text-lg">{selectedServiceData.price.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          )}

          {/* Кнопка отправки */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={!selectedService || !dateTime || !formData.name || !formData.phone || isSubmitting}
          >
            {isSubmitting ? "Отправка..." : "Записаться"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

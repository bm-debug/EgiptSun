"use client";

import { Calendar, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems?: Array<{title: string, category: string, sessions?: number, price: number}>;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export const BookingModal = ({ isOpen, onClose, cartItems = [] }: BookingModalProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Исключаем сертификаты и доставку из расчёта длительности
  const bookableItems = cartItems.filter(
    item =>
      !item.title.toLowerCase().includes('сертификат') &&
      !item.title.toLowerCase().includes('доставка')
  );

  // Расчет общей длительности всех процедур в минутах
  const calculateTotalDuration = (): number => {
    let totalMinutes = 0;
    
    bookableItems.forEach(item => {
      // Извлекаем длительность из category (например, "90 минут", "2 часа", "2,5 часа")
      const durationMatch = item.category.match(/(\d+(?:,\d+)?)(\s*час(?:а|ов)?|\s*мин(?:ут)?)?/i);
      if (durationMatch) {
        const value = parseFloat(durationMatch[1].replace(',', '.'));
        const unit = durationMatch[2]?.toLowerCase() || '';
        
        if (unit.includes('час')) {
          totalMinutes += value * 60;
        } else if (unit.includes('мин')) {
          totalMinutes += value;
        }
      }
    });
    
    return totalMinutes;
  };

  // Генерация дней недели
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  // Переход на предыдущую неделю
  const prevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  // Переход на следующую неделю
  const nextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  // Форматирование даты
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  };

  // Генерация временных слотов с учетом длительности процедур
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 10;
    const endHour = 22;
    const totalDuration = calculateTotalDuration(); // Общая длительность в минутах
    
    // Пример забронированных временных слотов (в реальности должно приходить с бэкенда)
    const bookedTimes: {start: string, end: string}[] = [
      {start: '11:00', end: '12:30'}, // Массаж тела на 90 минут
      {start: '14:30', end: '15:00'}  // Быстрая процедура
    ];
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Проверяем, помещается ли процедура в оставшееся время до закрытия
        const currentTime = hour * 60 + minute;
        const endTime = 22 * 60; // 22:00 в минутах
        const canFit = (endTime - currentTime) >= totalDuration;
        
        if (!canFit) {
          slots.push({
            time: timeString,
            available: false,
          });
          continue;
        }
        
        // Проверяем, не пересекается ли с забронированными слотами
        const slotEndMinutes = currentTime + totalDuration;
        const isOverlapping = bookedTimes.some(booked => {
          const [bookedStartHour, bookedStartMinute] = booked.start.split(':').map(Number);
          const [bookedEndHour, bookedEndMinute] = booked.end.split(':').map(Number);
          const bookedStart = bookedStartHour * 60 + bookedStartMinute;
          const bookedEnd = bookedEndHour * 60 + bookedEndMinute;
          
          // Проверяем пересечение
          return !(slotEndMinutes <= bookedStart || currentTime >= bookedEnd);
        });
        
        slots.push({
          time: timeString,
          available: !isOverlapping,
        });
      }
    }
    
    return slots;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null); // Сброс времени при выборе новой даты
  };

  const handleBooking = () => {
    if (selectedDate && selectedTime) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold">Запись на процедуру</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Calendar Week Navigation */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="icon" onClick={prevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-medium">
              {formatDate(currentWeekStart)} - {formatDate(weekDays[6])}
            </h3>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Week Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {weekDays.map((date, index) => {
              const isToday = new Date().toDateString() === date.toDateString();
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
              
              return (
                <button
                  key={index}
                  onClick={() => !isPast && handleDateSelect(date)}
                  disabled={isPast}
                  className={cn(
                    "flex flex-col items-center justify-center p-1 xl2:p-3 rounded-lg border transition-all text-xs xl2:text-sm",
                    isSelected && "bg-primary text-primary-foreground border-primary",
                    isToday && !isSelected && "border-primary bg-primary/10",
                    isPast && "opacity-30 cursor-not-allowed bg-muted",
                    !isPast && !isSelected && "hover:bg-accent"
                  )}
                >
                  <span className="text-xs uppercase">{formatDayName(date)}</span>
                  <span className="text-base xl2:text-lg font-semibold">{date.getDate()}</span>
                </button>
              );
            })}
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Доступное время на {formatDate(selectedDate)}:
              </h4>
              <div className="grid grid-cols-3 xl2:grid-cols-4 gap-2">
                {generateTimeSlots().map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={cn(
                      "p-2 rounded-md border text-sm font-medium transition-all",
                      slot.available
                        ? selectedTime === slot.time
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-accent"
                        : "opacity-30 cursor-not-allowed bg-muted line-through"
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap justify-end gap-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={handleBooking}
            disabled={!selectedDate || !selectedTime}
          >
            Подтвердить запись
          </Button>
        </div>
      </div>
    </div>
  );
};

"use client";

import { Star, Upload, X, Zap } from "lucide-react";
import { useRef, useState } from "react";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Container } from "@/components/misc/layout/сontainer";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    name: "Анна Михайлова",
    role: "Посетитель",
    avatar: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
    content:
      "Это лучшее место для отдыха в городе! После посещения SPA-программы «Нефертити» я чувствую себя заново рожденной. Мастера настоящие профессионалы своего дела.",
  },
  {
    name: "Елена Соколова",
    role: "Постоянный клиент",
    avatar: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp",
    content:
      "Хожу в «Солнце Египта» уже несколько месяцев. Массаж тела просто потрясающий! Снимает всю усталость после рабочей недели. Очень нравится атмосфера спокойствия и гармонии.",
  },
  {
    name: "Дмитрий Волков",
    role: "Клиент",
    avatar: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp",
    content:
      "Профессиональный подход и отличное качество услуг. Спортивный массаж помог мне быстрее восстановиться после травм. Рекомендую всем, кто ценит свое здоровье!",
  },
  {
    name: "Ольга Петрова",
    role: "Посетитель",
    avatar: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-4.webp",
    content:
      "Подарила маме сертификат на программу «Клеопатра» - она в полном восторге! Теперь ходим вместе. Спасибо за ваш труд и заботу о клиентах.",
  },
  {
    name: "Игорь Морозов",
    role: "Постоянный клиент",
    avatar: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-5.webp",
    content:
      "Лучшее соотношение цены и качества. Регулярно прохожу курс массажа спины - забыл о болях в шее и спине от сидячей работы. Персонал очень внимательный.",
  },
  {
    name: "Мария Лебедева",
    role: "Клиент",
    avatar: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-6.webp",
    content:
      "Аромамассаж - это что-то невероятное! После часа такого релакса чувствуешь себя как после недельного отпуска. Обязательно попробую другие программы.",
  },
];

interface Testimonial19Props {
  className?: string;
}

const Testimonial19 = ({ className }: Testimonial19Props) => {
  return (
    <section id="testimonials" className={cn("py-16 md:py-32", className)}>
      <Container className="w-full">
        <div className="flex flex-col items-center gap-4">
        <h2 className="text-center text-3xl font-semibold lg:text-4xl max-w-3xl mx-auto">
          Отзывы наших счастливых клиентов
        </h2>
        <p className="text-center text-muted-foreground lg:text-lg max-w-2xl mx-auto">
          Присоединяйтесь к нашим довольным посетителям
        </p>
        </div>
        <div className="mt-16 space-y-4">
          <Carousel
            opts={{
              loop: true,
            }}
            className="relative before:absolute before:top-0 before:bottom-0 before:left-0 before:z-10 before:w-36 before:bg-linear-to-r before:from-background before:to-transparent after:absolute after:top-0 after:right-0 after:bottom-0 after:z-10 after:w-36 after:bg-linear-to-l after:from-background after:to-transparent"
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="basis-auto">
                  <Card className="max-w-96 p-6 select-none">
                    <div className="flex justify-between">
                      <div className="mb-4 flex gap-4">
                        <Avatar className="size-14 rounded-full ring-1 ring-input">
                          <AvatarImage
                            src={testimonial.avatar}
                            alt={testimonial.name}
                          />
                        </Avatar>
                        <div>
                          <p className="font-medium">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {testimonial.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Star className="size-5 fill-amber-500 text-amber-500" />
                        <Star className="size-5 fill-amber-500 text-amber-500" />
                        <Star className="size-5 fill-amber-500 text-amber-500" />
                        <Star className="size-5 fill-amber-500 text-amber-500" />
                        <Star className="size-5 fill-amber-500 text-amber-500" />
                      </div>
                    </div>
                    <q className="leading-7 text-muted-foreground">
                      {testimonial.content}
                    </q>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 z-20 md:left-4" />
            <CarouselNext className="right-2 z-20 md:right-4" />
          </Carousel>
        </div>

      {/* Форма для добавления отзыва */}
      <ReviewForm />
      </Container>
    </section>
  );
};

const ReviewForm = () => {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const remainingSlots = 3 - photos.length;
    const filesToAdd = newFiles.slice(0, remainingSlots);

    const updatedPhotos = [...photos, ...filesToAdd];
    setPhotos(updatedPhotos);

    const previews = filesToAdd.map(file => URL.createObjectURL(file));
    setPhotoPreviews([...photoPreviews, ...previews]);
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    const updatedPreviews = photoPreviews.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    setPhotoPreviews(updatedPreviews);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Отзыв отправлен:', { name, text, photos });
    setName("");
    setText("");
    setPhotos([]);
    setPhotoPreviews([]);
    alert('Спасибо за ваш отзыв!');
  };

  return (
    <div className="mx-auto mt-12 w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-3 bg-background rounded-xl p-4 md:p-6 border">
        <div>
          <Input
            type="text"
            placeholder="Ваше имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border-[1.5px] !border-gray-400 focus:!border-primary focus:ring-0 focus-visible:ring-0 transition-colors"
          />
        </div>
        
        <div>
          <Textarea
            placeholder="Ваш отзыв"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 250))}
            required
            rows={4}
            className="w-full resize-none border-[1.5px] !border-gray-400 focus:!border-primary focus:ring-0 focus-visible:ring-0 transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {text.length}/250
          </p>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photos.length >= 3}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#BD8736] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            Добавить фото
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="hidden"
          />
          {photoPreviews.length > 0 && (
            <div className="flex gap-2">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Фото ${index + 1}`}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full bg-[#BD8736] hover:bg-[#BD8736]/90"
          disabled={!name.trim() || !text.trim()}
        >
          Отправить отзыв
        </Button>
      </form>
    </div>
  );
};

export { Testimonial19 };
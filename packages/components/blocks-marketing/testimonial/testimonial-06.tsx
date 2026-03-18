"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { StarIcon, Upload, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const testimonials = [
  {
    id: 1,
    name: "Анна Михайлова",
    designation: "Посетитель",
    testimonial:
      "Это лучшее место для отдыха в городе! После посещения SPA-программы «Нефертити» я чувствую себя заново рожденной. Мастера настоящие профессионалы своего дела. Обязательно вернусь снова!",
    avatar: "https://randomuser.me/api/portraits/women/1.jpg",
  },
  {
    id: 2,
    name: "Елена Соколова",
    designation: "Постоянный клиент",
    testimonial:
      "Хожу в «Солнце Египта» уже несколько месяцев. Массаж тела просто потрясающий! Снимает всю усталость после рабочей недели. Очень нравится атмосфера спокойствия и гармонии.",
    avatar: "https://randomuser.me/api/portraits/women/2.jpg",
  },
  {
    id: 3,
    name: "Дмитрий Волков",
    designation: "Клиент",
    testimonial:
      "Профессиональный подход и отличное качество услуг. Спортивный массаж помог мне быстрее восстановиться после травм. Рекомендую всем, кто ценит свое здоровье!",
    avatar: "https://randomuser.me/api/portraits/men/3.jpg",
  },
  {
    id: 4,
    name: "Ольга Петрова",
    designation: "Посетитель",
    testimonial:
      "Подарила маме сертификат на программу «Клеопатра» - она в полном восторге! Теперь ходим вместе. Спасибо за ваш труд и заботу о клиентах.",
    avatar: "https://randomuser.me/api/portraits/women/4.jpg",
  },
  {
    id: 5,
    name: "Игорь Морозов",
    designation: "Постоянный клиент",
    testimonial:
      "Лучшее соотношение цены и качества. Регулярно прохожу курс массажа спины - забыл о болях в шее и спине от сидячей работы. Персонал очень внимательный.",
    avatar: "https://randomuser.me/api/portraits/men/5.jpg",
  },
  {
    id: 6,
    name: "Мария Лебедева",
    designation: "Клиент",
    testimonial:
      "Аромамассаж - это что-то невероятное! После часа такого релакса чувствуешь себя как после недельного отпуска. Обязательно попробую другие программы.",
    avatar: "https://randomuser.me/api/portraits/women/6.jpg",
  },
];
const Testimonial06 = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div id="testimonials" className="min-h-screen w-full flex flex-col justify-center items-center py-12 px-6">
      <div className="w-full max-w-7xl">
        <h2 className="text-5xl font-semibold text-center tracking-[-0.03em] mb-3">
          Отзывы наших клиентов
        </h2>
        <p className="text-center text-muted-foreground text-xl mb-14">
          Узнайте, что говорят о нас наши посетители
        </p>
        
        {/* Карусель с отзывами */}
        <div className="Container w-full lg:max-w-(--breakpoint-lg) xl:max-w-(--breakpoint-xl) mx-auto px-12 mb-16">
          <Carousel setApi={setApi}>
            <CarouselContent>
              {testimonials.map((testimonial) => (
                <CarouselItem key={testimonial.id}>
                  <TestimonialCard testimonial={testimonial} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn("h-3.5 w-3.5 rounded-full border-2", {
                  "bg-primary border-primary": current === index + 1,
                })}
              />
            ))}
          </div>
        </div>
        
        {/* Форма для добавления отзыва - под каруселью */}
        <ReviewForm />
      </div>
    </div>
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

    // Создаем превью
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
    // Здесь будет логика отправки отзыва
    setName("");
    setText("");
    setPhotos([]);
    setPhotoPreviews([]);
    alert('Спасибо за ваш отзыв!');
  };

  return (
    <div className="mt-12 max-w-2xl mx-auto px-6">
      <form onSubmit={handleSubmit} className="space-y-3 bg-accent rounded-xl p-4">
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
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="w-full"
          disabled={!name.trim() || !text.trim()}
        >
          Отправить отзыв
        </Button>
      </form>
    </div>
  );
};

const TestimonialCard = ({
  testimonial,
}: {
  testimonial: (typeof testimonials)[number];
}) => (
  <div className="mb-8 bg-accent rounded-xl py-8 px-6 sm:py-6">
    <div className="flex items-center justify-between gap-20">
      <div className="hidden lg:block relative shrink-0 aspect-3/4 max-w-[18rem] w-full bg-muted-foreground/20 rounded-xl">
        <div className="absolute top-1/4 right-0 translate-x-1/2 h-12 w-12 bg-primary rounded-full flex items-center justify-center">
          <svg
            width="102"
            height="102"
            viewBox="0 0 102 102"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
          >
            <path
              d="M26.0063 19.8917C30.0826 19.8625 33.7081 20.9066 36.8826 23.024C40.057 25.1414 42.5746 28.0279 44.4353 31.6835C46.2959 35.339 47.2423 39.4088 47.2744 43.8927C47.327 51.2301 44.9837 58.4318 40.2444 65.4978C35.4039 72.6664 28.5671 78.5755 19.734 83.2249L2.54766 74.1759C8.33598 71.2808 13.2548 67.9334 17.3041 64.1335C21.2515 60.3344 23.9203 55.8821 25.3105 50.7765C20.5179 50.4031 16.6348 48.9532 13.6612 46.4267C10.5864 44.0028 9.03329 40.5999 9.00188 36.2178C8.97047 31.8358 10.5227 28.0029 13.6584 24.7192C16.693 21.5381 20.809 19.9289 26.0063 19.8917ZM77.0623 19.5257C81.1387 19.4965 84.7641 20.5406 87.9386 22.6581C91.1131 24.7755 93.6306 27.662 95.4913 31.3175C97.3519 34.9731 98.2983 39.0428 98.3304 43.5268C98.383 50.8642 96.0397 58.0659 91.3004 65.1319C86.4599 72.3005 79.6231 78.2095 70.79 82.859L53.6037 73.8099C59.392 70.9149 64.3108 67.5674 68.3601 63.7676C72.3075 59.9685 74.9763 55.5161 76.3665 50.4105C71.5739 50.0372 67.6908 48.5873 64.7172 46.0608C61.6424 43.6369 60.0893 40.2339 60.0579 35.8519C60.0265 31.4698 61.5787 27.6369 64.7145 24.3532C67.7491 21.1722 71.865 19.563 77.0623 19.5257Z"
              className="fill-primary-foreground"
            />
          </svg>
        </div>
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex items-center justify-between gap-1">
          <div className="hidden sm:flex md:hidden items-center gap-4">
            <Avatar className="w-8 h-8 md:w-10 md:h-10">
              <AvatarFallback className="text-xl font-medium bg-primary text-primary-foreground">
                {testimonial.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{testimonial.name}</p>
              <p className="text-sm text-gray-500">{testimonial.designation}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <StarIcon className="w-5 h-5 fill-muted-foreground stroke-muted-foreground" />
            <StarIcon className="w-5 h-5 fill-muted-foreground stroke-muted-foreground" />
            <StarIcon className="w-5 h-5 fill-muted-foreground stroke-muted-foreground" />
            <StarIcon className="w-5 h-5 fill-muted-foreground stroke-muted-foreground" />
            <StarIcon className="w-5 h-5 fill-muted-foreground stroke-muted-foreground" />
          </div>
        </div>
        <p className="mt-6 text-lg sm:text-2xl lg:text-[1.75rem] xl:text-3xl leading-normal lg:leading-normal! font-semibold tracking-tight">
          {testimonial.testimonial}
        </p>
        <div className="flex sm:hidden md:flex mt-6 items-center gap-4">
          <Avatar>
            <AvatarFallback className="text-xl font-medium bg-primary text-primary-foreground">
              {testimonial.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{testimonial.name}</p>
            <p className="text-sm text-gray-500">{testimonial.designation}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Testimonial06;

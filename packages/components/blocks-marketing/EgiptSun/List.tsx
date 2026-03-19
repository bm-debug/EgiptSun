"use client";

import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gift,
  X,
} from "lucide-react";
import { SpaRelax, Aromatherapy, Stone, Face, Cupping, Flower } from "./icons";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Container } from "@/components/misc/layout/сontainer";
import { cn } from "@/lib/utils";
import { MASSAGE_DATA } from "./massage-data";
import { BookingModal } from "./BookingModal";

interface ListItem {
  icon: React.ReactNode;
  title: string;
  category: string;
  description: string;
  link: string;
  fullDescription?: string;
  basePrice?: number;
  isExpanded?: boolean;
  sessionOptions?: {
    sessions: number;
    price: number;
  }[];
}

interface List2Props {
  heading?: string;
  items?: ListItem[];
  className?: string;
  id?: string;
}

type SessionPricingOption = { sessions: number; price: number };

/** List price = single-session rate × count; bundle = package price. Strikethrough when bundle saves money. */
function getSessionBundlePriceDisplay(
  options: SessionPricingOption[],
  sessionsSelected: number,
) {
  const unitPrice =
    options.find((o) => o.sessions === 1)?.price ?? options[0]?.price ?? 0;
  const selectedOption =
    options.find((o) => o.sessions === sessionsSelected) ?? options[0] ?? {
      sessions: 1,
      price: unitPrice,
    };
  const bundlePrice = selectedOption.price;
  const listPriceAtSingleRate = unitPrice * sessionsSelected;
  const showListStrikethrough =
    sessionsSelected > 1 && listPriceAtSingleRate > bundlePrice;
  return {
    bundlePrice,
    listPriceAtSingleRate,
    showListStrikethrough,
  };
}

const List2 = ({
  heading = "Наши услуги",
  items = [
    {
      icon: <SpaRelax className="h-10 w-10" />,
      title: "Нефертити",
      category: "90 минут",
      description: "Ваш личный оазис релакса",
      link: "#",
      fullDescription: `Эта комплексная программа создана для тех, кто хочет сбросить груз повседневных забот, очистить организм и вернуть коже сияющий вид. Ваше путешествие начинается в теплой сауне, где исчезает усталость. Мягкое инфракрасное тепло проникает глубоко в ткани, подготавливая тело к дальнейшим процедурам. Далее вас ждет бережное очищение кожи с помощью натурального пилинга. Скраб удаляет ороговевшие клетки, открывает поры и делает кожу невероятно гладкой и шелковистой. Кульминация программы — час блаженства. Массаж Нефертити — это королевский ритуал, который восстановит ваши силы и энергетический баланс и погрузит вас в состояние глубокой медитации. Техника подбирается индивидуально: от расслабляющей до тонизирующей.\n\nВесь ритуал завершается церемонией чаепития. Мы не отпускаем вас сразу в городской шум. После процедур вас ждет уютная зона отдыха с финиками и сухофруктами, а также чашка ароматного Египетского чая. Это время необходимо, чтобы закрепить результат, насладиться послевкусием отдыха и плавно вернуться в реальность с новыми силами.`,
      basePrice: 4900,
    },
    {
      icon: <Stone className="h-10 w-10" />,
      title: "Солнце Египта",
      category: "2 часа",
      description: "Сила фараонов. Нежность богинь",
      link: "#",
      fullDescription: `Роскошная двухчасовая SPA-программа, вдохновленная ритуалами красоты Древнего Египта, начинается в инфракрасной сауне. В отличие от традиционной бани, ИК-сауна бережно подготавливает сосуды и раскрывает поры, выводя токсины и снимая мышечное напряжение. Это идеальный «разогрев» для последующих этапов. Далее скрабирование натуральными составами деликатно выравнивает микрорельеф, улучшает кровообращение и делает кожу невероятно гладкой, подготавливая её к впитыванию ценных микроэлементов. Затем обертывание на основе целебной глины или питательного состава с экстрактами лотоса и меда. Пока активные компоненты работают над лимфодренажем и увлажнением, вы погружаетесь в состояние глубокого покоя. Результат — подтянутая кожа и выраженный антистресс-эффект.\n\nИ финальный аккорд, завершающий и самый глубокий этап программы - часовой сеанс общего массажа с использованием ароматических масел снимет оставшиеся зажимы, восстановит энергетический баланс и подарит чувство абсолютной гармонии.`,
      basePrice: 5900,
    },
    {
      icon: <Aromatherapy className="h-10 w-10" />,
      title: "Клеопатра",
      category: "2,5 часа",
      description: "Ваше путешествие к истокам безмятежности",
      link: "#",
      fullDescription: `Почувствуйте себя великой царицей, чья красота и магнетизм покоряли империи. Эта программа — не просто набор процедур, а воссозданный древнеегипетский ритуал, направленный на глубокое омоложение, питание кожи и обретение внутренней гармонии.\n\nПервый шаг к преображению — мягкое распаривание в сауне, которое подготавливает тело. А тонкие ароматы ладана или мирта помогут отпустить лишние мысли и настроиться на ритуал красоты.\nДеликатный пилинг, на основе натуральных компонентов по вашему выбору, бережно обновляет кожу, делая ее безупречно гладкой и сияющей, словно шелк. Визитная карточка красоты Клеопатры - нежная маска для тела глубоко питает, насыщает кожу витаминами и протеинами. Пока вы отдыхаете в теплом коконе, ваша кожа становится бархатистой, упругой и приобретает нежный фарфоровый оттенок.\n\nЗатем последует 1,5 часовой массаж лица и тела, пробуждающий в вас энергию, о которой вы ранее и не знали! Наконец, после восточного массажа, вас ждет завершение ритуала за чашкой традиционного чая каркаде или ароматного травяного сбора с финиками. Это время, чтобы окончательно заземлиться и насладиться обновленным состоянием… и почувствовать, что ваше тело и душа стали поистине королевскими!`,
      basePrice: 7500,
    },
    {
      icon: <Flower className="h-10 w-10" />,
      title: "Бастет-леди",
      category: "3 часа",
      description: "Роскошь древнего Египта для современной леди",
      link: "#",
      fullDescription: `Погрузитесь в атмосферу вечного блаженства и почувствуйте себя земным воплощением богини красоты и радости с нашей эксклюзивной программой. Этот трехчасовой ритуал — дань уважения женственности, грации и той магической силе, которой в Древнем Египте наделяли покровительницу домашнего очага.\n\nПод таинственным паром сауны почувствуйте тепло, разливающееся по вашему телу, открывающее путь к трансформации.\nНа втором этапе мы используем секреты египетских красавиц. Тонкое очищение скрабом удаляет всё лишнее, делая кожу сияющей и гладкой, словно драгоценный шелк.\nПока вы отдыхаете в нежных и теплых объятиях обертывания, ваша кожа насыщается питательными элементами из натуральных кремов и масел, привезенных из Египта.\n\nЗатем длительный массаж лица и тела — это сердце программы, после которого вы почувствуете ту самую «кошачью» гибкость, лифтинг и легкость во всем теле. Это ритуал сохранения молодости, достойный самой царицы.\n\nПосле завершения процедур мы приглашаем вас на традиционное чаепитие с восточными угощениями. Наслаждайтесь ароматным напитком в тишине, позволяя эффекту от программы закрепиться, а вашим чувствам — прийти в полное равновесие.\n\n«Бастет-леди» — это не просто уход, это возвращение к своей истинной природе. Позвольте себе роскошь быть богиней.`,
      basePrice: 8900,
    },
    ...MASSAGE_DATA,
  ],
  className,
  id,
}: List2Props) => {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<{[key: string]: number}>({});
  const [cartItems, setCartItems] = useState<Array<{title: string, category: string, sessions?: number, price: number}>>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isGiftCertificateModalOpen, setIsGiftCertificateModalOpen] = useState(false);
  
  // Gift certificate form states
  const [certificateType, setCertificateType] = useState<'online' | 'paper'>('online');
  const [certificateValue, setCertificateValue] = useState<'amount' | 'service'>('amount');
  const [giftAmount, setGiftAmount] = useState<string>('');
  const [selectedServiceIndex, setSelectedServiceIndex] = useState<number>(0);
  const [email, setEmail] = useState<string>('');
  const [sendDate, setSendDate] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'courier'>('pickup');
  const [address, setAddress] = useState<string>('');

  const addToCart = (title: string, category: string, sessions: number | undefined, price: number) => {
    console.log('Adding to cart:', { title, category, sessions, price });
    setCartItems(prev => [...prev, { title, category, sessions, price }]);
  };

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

  // Расчет базовой стоимости без скидок
  const calculateBasePrice = (item: typeof cartItems[0]) => {
    const spaPrograms = items.slice(0, 4);
    const spaProgram = spaPrograms.find(p => p.title === item.title);
    if (spaProgram && spaProgram.basePrice) {
      return spaProgram.basePrice;
    }
    
    const massageItem = MASSAGE_DATA.find(m => m.title === item.title);
    if (massageItem && massageItem.sessionOptions) {
      const baseOption = massageItem.sessionOptions[0];
      if (baseOption && item.sessions) {
        // Базовая цена за 1 сеанс * количество сеансов
        return baseOption.price * item.sessions;
      }
    }
    
    return item.price;
  };

  const totalBasePrice = cartItems.reduce((sum, item) => sum + calculateBasePrice(item), 0);
  const totalDiscount = totalBasePrice - totalPrice;

  const formatPrice = (price: number) => {
    return price.toLocaleString('ru-RU') + ' ₽';
  };

  const handleGiftCertificateClick = () => {
    setIsGiftCertificateModalOpen(true);
  };

  const handleAddGiftCertificate = () => {
    let certificateTitle = 'Подарочный сертификат';
    let category = '';
    let price = 0;

    if (certificateValue === 'amount') {
      const amount = parseFloat(giftAmount);
      if (amount >= 3000) {
        certificateTitle = `Сертификат на сумму`;
        category = `${formatPrice(amount)}`;
        price = amount;
      } else {
        alert('Минимальная сумма сертификата - 3000₽');
        return;
      }
    } else {
      const service = items[selectedServiceIndex];
      price = service.basePrice || service.sessionOptions?.[0]?.price || 0;
      certificateTitle = 'Сертификат на услугу';
      category = service.title;
    }

    // Добавляем дополнительную информацию в зависимости от типа
    const additionalInfo = certificateType === 'online' 
      ? `Онлайн • ${email}${sendDate ? ` • Отправка: ${sendDate}` : ''}`
      : `Бумажный • ${deliveryMethod === 'pickup' ? 'Самовывоз' : 'Доставка курьером'}`;

    addToCart(certificateTitle, `${category} • ${additionalInfo}`, undefined, price);
    setIsGiftCertificateModalOpen(false);
    
    // Сброс формы
    setGiftAmount('');
    setSelectedServiceIndex(0);
    setEmail('');
    setSendDate('');
    setComment('');
    setAddress('');
  };
  return (
    <section id={id} className={cn("py-32", className)}>
      <Container>
        <h1 className="mb-10 text-center text-3xl font-semibold md:mb-14 md:text-4xl">
          {heading}
        </h1>
        
        {/* SPA Programs Section */}
        <h2 className="mb-6 text-center text-2xl font-medium text-muted-foreground">
          SPA - программы
        </h2>
        
        <div className="flex flex-col">
          <Separator />
          {items.slice(0, 4).map((item, index) => (
            <React.Fragment key={index}>
              <div className="grid items-start gap-4 px-4 py-5 md:grid-cols-4">
                {/* Иконка с названием - на мобильном сверху */}
                <div className="flex items-center gap-2 md:order-none">
                  <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                    {item.icon}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.category}
                    </p>
                  </div>
                </div>
                
                {/* Описание - на всю ширину на мобильном, вниз */}
                <div className="md:col-span-2">
                  {item.fullDescription ? (
                    <button
                      onClick={() => setExpandedItem(expandedItem === index ? null : index)}
                      className="text-left hover:text-[#BD8736] transition-colors cursor-pointer w-full"
                    >
                      <p className="text-lg md:text-2xl font-semibold text-center max-w-2xl mx-auto">
                        {item.description}
                      </p>
                    </button>
                  ) : (
                    <p className="text-lg md:text-2xl font-semibold text-center max-w-2xl mx-auto">
                      {item.description}
                    </p>
                  )}
                  {expandedItem === index && item.fullDescription && (
                    <div className="mt-4 p-4 bg-muted rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {item.fullDescription}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Цена и кнопка - справа на мобильном */}
                <div className="flex items-center justify-end gap-2 md:order-none md:ml-auto">
                  {item.basePrice ? (
                    <>
                      <span className="font-semibold whitespace-nowrap">
                        {formatPrice(item.basePrice)}
                      </span>
                      <Button 
                        variant="outline" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addToCart(item.title, item.category, undefined, item.basePrice || 0);
                        }}
                        size="sm"
                      >
                        <span>Добавить</span>
                      </Button>
                    </>
                  ) : item.sessionOptions ? (
                    <>
                      <select
                        value={selectedSessions[item.title] || 1}
                        onChange={(e) => {
                          setSelectedSessions({
                            ...selectedSessions,
                            [item.title]: Number(e.target.value),
                          });
                        }}
                        className="px-2 py-2 border rounded-md text-sm bg-background whitespace-nowrap"
                      >
                        {item.sessionOptions.map((option) => (
                          <option key={option.sessions} value={option.sessions}>
                            {option.sessions} сеанс{option.sessions === 1 ? '' : option.sessions < 5 ? 'а' : 'ов'}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const sessionsSelected = selectedSessions[item.title] || 1;
                        const {
                          bundlePrice,
                          listPriceAtSingleRate,
                          showListStrikethrough,
                        } = getSessionBundlePriceDisplay(
                          item.sessionOptions,
                          sessionsSelected,
                        );
                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            {showListStrikethrough ? (
                              <span className="text-sm line-through text-muted-foreground whitespace-nowrap">
                                {formatPrice(listPriceAtSingleRate)}
                              </span>
                            ) : null}
                            <span className="font-semibold whitespace-nowrap">
                              {formatPrice(bundlePrice)}
                            </span>
                          </div>
                        );
                      })()}
                      <Button 
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const sessions = selectedSessions[item.title] || 1;
                          const price = item.sessionOptions?.find(opt => opt.sessions === sessions)?.price || 0;
                          addToCart(item.title, item.category, sessions, price);
                        }}
                        size="sm"
                      >
                        <span>Добавить</span>
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              <Separator />
            </React.Fragment>
          ))}
        </div>
        
        {/* Massage Section */}
        <h2 className="mt-12 mb-6 text-center text-2xl font-medium text-muted-foreground">
          Массажи
        </h2>
        
        <div className="flex flex-col">
          <Separator />
          {items.slice(4).map((item, index) => (
            <React.Fragment key={index + 4}>
              <div className="grid items-start gap-4 px-4 py-5 md:grid-cols-4">
                {/* Иконка с названием - на мобильном сверху */}
                <div className="flex items-center gap-2 md:order-none">
                  <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                    {item.icon}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.category}
                    </p>
                  </div>
                </div>
                
                {/* Описание - на всю ширину на мобильном, вниз */}
                <div className="md:col-span-2">
                  {item.fullDescription ? (
                    <button
                      onClick={() => setExpandedItem(expandedItem === index + 4 ? null : index + 4)}
                      className="text-left hover:text-[#BD8736] transition-colors cursor-pointer w-full"
                    >
                      <p className="text-lg md:text-2xl font-semibold text-center max-w-2xl mx-auto">
                        {item.description}
                      </p>
                    </button>
                  ) : (
                    <p className="text-lg md:text-2xl font-semibold text-center max-w-2xl mx-auto">
                      {item.description}
                    </p>
                  )}
                  {expandedItem === index + 4 && item.fullDescription && (
                    <div className="mt-4 p-4 bg-muted rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {item.fullDescription}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Цена и кнопка - справа на мобильном */}
                <div className="flex items-center justify-end gap-2 md:order-none md:ml-auto">
                  {item.basePrice ? (
                    <>
                      <span className="font-semibold whitespace-nowrap">
                        {formatPrice(item.basePrice)}
                      </span>
                      <Button 
                        variant="outline" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addToCart(item.title, item.category, undefined, item.basePrice || 0);
                        }}
                        size="sm"
                      >
                        <span>Добавить</span>
                      </Button>
                    </>
                  ) : item.sessionOptions ? (
                    <>
                      <select
                        value={selectedSessions[item.title] || 1}
                        onChange={(e) => {
                          setSelectedSessions({
                            ...selectedSessions,
                            [item.title]: Number(e.target.value),
                          });
                        }}
                        className="px-2 py-2 border rounded-md text-sm bg-background whitespace-nowrap"
                      >
                        {item.sessionOptions.map((option) => (
                          <option key={option.sessions} value={option.sessions}>
                            {option.sessions} сеанс{option.sessions === 1 ? '' : option.sessions < 5 ? 'а' : 'ов'}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const sessionsSelected = selectedSessions[item.title] || 1;
                        const {
                          bundlePrice,
                          listPriceAtSingleRate,
                          showListStrikethrough,
                        } = getSessionBundlePriceDisplay(
                          item.sessionOptions,
                          sessionsSelected,
                        );
                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            {showListStrikethrough ? (
                              <span className="text-sm line-through text-muted-foreground whitespace-nowrap">
                                {formatPrice(listPriceAtSingleRate)}
                              </span>
                            ) : null}
                            <span className="font-semibold whitespace-nowrap">
                              {formatPrice(bundlePrice)}
                            </span>
                          </div>
                        );
                      })()}
                      <Button 
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const sessions = selectedSessions[item.title] || 1;
                          const price = item.sessionOptions?.find(opt => opt.sessions === sessions)?.price || 0;
                          addToCart(item.title, item.category, sessions, price);
                        }}
                        size="sm"
                      >
                        <span>Добавить</span>
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              <Separator />
            </React.Fragment>
          ))}
          
          {/* Gift Certificate - визуально отделен от остальных массажей */}
          <div className="my-6" />
          <div className="grid items-center gap-4 px-4 py-5 md:grid-cols-4">
            <div className="order-2 flex items-center gap-2 md:order-none">
              <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                <Gift className="h-6 w-6" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">Подарочный сертификат</h3>
                <p className="text-sm text-muted-foreground">
                  Идеальный подарок для близких
                </p>
              </div>
            </div>
            <div className="order-1 md:order-none md:col-span-2 flex items-center justify-center">
              <p className="text-2xl font-semibold text-center">
                Подарите эмоции и заботу
              </p>
            </div>
            <div className="order-3 ml-auto w-fit gap-2 md:order-none flex items-center">
              <Button 
                variant="outline"
                onClick={handleGiftCertificateClick}
              >
                <span>Выбрать</span>
              </Button>
            </div>
          </div>
          <Separator />
        </div>
      </Container>
      
      {/* Cart Summary Section */}
      {cartItems.length > 0 && (
        <Container className="mt-12">
          <div className="bg-muted rounded-lg p-6 max-w-3xl mx-auto">
            <h3 className="text-xl font-semibold mb-4 text-center">Выбранные услуги</h3>
            
            <div className="space-y-3 mb-6">
              {cartItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between pb-3 border-b last:border-0">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.category}
                      {item.sessions && ` • ${item.sessions} сеанс${item.sessions === 1 ? '' : item.sessions < 5 ? 'а' : 'ов'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{formatPrice(item.price)}</span>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-muted-foreground hover:text-[#BD8736] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-2 mb-6">
              {/* Базовая стоимость - отображается только если есть скидка */}
              {totalDiscount > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Базовая стоимость:</span>
                    <span className="line-through text-muted-foreground">{formatPrice(totalBasePrice)}</span>
                  </div>
                  
                  {/* Скидка - отображается только если больше 0 */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#BD8736] font-medium">Скидка за количество сеансов:</span>
                    <span className="text-[#BD8736] font-medium">-{formatPrice(totalDiscount)}</span>
                  </div>
                </>
              )}
              
              {/* Итоговая сумма */}
              <Separator className="my-3" />
              <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-bold">Итого{totalDiscount > 0 ? ' (скидка включена)' : ''}:</span>
                <span className="text-2xl font-bold text-[#BD8736]">{formatPrice(totalPrice)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <Button 
                className="w-full bg-[#BD8736] hover:bg-[#BD8736]/90" 
                size="lg"
                onClick={() => setIsBookingModalOpen(true)}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Записаться
              </Button>
              <Button 
                className="w-full bg-[#BD8736] hover:bg-[#BD8736]/90" 
                size="lg"
                onClick={() => {
                  console.log('Proceeding to payment:', { items: cartItems, total: totalPrice });
                  alert('Переход к оплате...\nСумма: ' + formatPrice(totalPrice));
                }}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Оплатить
              </Button>
            </div>
          </div>
        </Container>
      )}
      
      {/* Booking Modal */}
      {isBookingModalOpen && (
        <BookingModal 
          isOpen={isBookingModalOpen} 
          onClose={() => setIsBookingModalOpen(false)}
          cartItems={cartItems}
        />
      )}

      {/* Gift Certificate Modal */}
      {isGiftCertificateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
            <button
              onClick={() => setIsGiftCertificateModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-6 space-y-6">
              <h3 className="text-2xl font-semibold text-center">Подарочный сертификат</h3>
              
              {/* Тип сертификата: онлайн или бумажный */}
              <div className="space-y-3">
                <Label>Тип сертификата</Label>
                <RadioGroup 
                  value={certificateType} 
                  onValueChange={(value) => setCertificateType(value as 'online' | 'paper')}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="online" id="online" className="peer sr-only" />
                    <Label
                      htmlFor="online"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#BD8736] peer-data-[state=checked]:bg-[#BD8736]/10 [&:has([data-state=checked])]:border-[#BD8736] [&:has([data-state=checked])]:bg-[#BD8736]/10 cursor-pointer"
                    >
                      <span className="text-lg font-semibold">Онлайн</span>
                      <span className="text-sm text-muted-foreground mt-1">На email</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="paper" id="paper" className="peer sr-only" />
                    <Label
                      htmlFor="paper"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#BD8736] peer-data-[state=checked]:bg-[#BD8736]/10 [&:has([data-state=checked])]:border-[#BD8736] [&:has([data-state=checked])]:bg-[#BD8736]/10 cursor-pointer"
                    >
                      <span className="text-lg font-semibold">Бумажный</span>
                      <span className="text-sm text-muted-foreground mt-1">В салоне или доставка</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Что выбираем: сумма или услуга */}
              <div className="space-y-3">
                <Label>Что будет в сертификате?</Label>
                <RadioGroup 
                  value={certificateValue} 
                  onValueChange={(value) => setCertificateValue(value as 'amount' | 'service')}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="amount" id="amount" className="peer sr-only" />
                    <Label
                      htmlFor="amount"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#BD8736] peer-data-[state=checked]:bg-[#BD8736]/10 [&:has([data-state=checked])]:border-[#BD8736] [&:has([data-state=checked])]:bg-[#BD8736]/10 cursor-pointer"
                    >
                      <span className="text-lg font-semibold">На сумму</span>
                      <span className="text-sm text-muted-foreground mt-1">От 3000₽</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="service" id="service" className="peer sr-only" />
                    <Label
                      htmlFor="service"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#BD8736] peer-data-[state=checked]:bg-[#BD8736]/10 [&:has([data-state=checked])]:border-[#BD8736] [&:has([data-state=checked])]:bg-[#BD8736]/10 cursor-pointer"
                    >
                      <span className="text-lg font-semibold">На услугу</span>
                      <span className="text-sm text-muted-foreground mt-1">Выбрать из списка</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Поля для ввода суммы или выбора услуги */}
              {certificateValue === 'amount' ? (
                <div className="space-y-2">
                  <Label htmlFor="giftAmount">Сумма сертификата (от 3000₽)</Label>
                  <Input
                    id="giftAmount"
                    type="number"
                    value={giftAmount}
                    onChange={(e) => setGiftAmount(e.target.value)}
                    placeholder="Введите сумму"
                    min="3000"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="service">Выберите услугу</Label>
                  <Select value={String(selectedServiceIndex)} onValueChange={(value) => setSelectedServiceIndex(Number(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите услугу" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item, index) => (
                        <SelectItem key={index} value={String(index)}>
                          {item.title} - {item.basePrice ? formatPrice(item.basePrice) : formatPrice(item.sessionOptions?.[0]?.price || 0)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Дополнительные поля для онлайн сертификата */}
              {certificateType === 'online' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email для получения сертификата</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sendDate">Дата отправки</Label>
                    <Input
                      id="sendDate"
                      type="date"
                      value={sendDate}
                      onChange={(e) => setSendDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comment">Поздравление (до 200 символов)</Label>
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, 200))}
                      placeholder="Ваше поздравление..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {comment.length}/200
                    </p>
                  </div>
                </>
              )}

              {/* Дополнительные поля для бумажного сертификата */}
              {certificateType === 'paper' && (
                <>
                  <div className="space-y-3">
                    <Label>Как получить?</Label>
                    <RadioGroup 
                      value={deliveryMethod} 
                      onValueChange={(value) => setDeliveryMethod(value as 'pickup' | 'courier')}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pickup" id="pickup" className="text-[#BD8736] border-[#BD8736]" />
                        <Label htmlFor="pickup" className="cursor-pointer">Забрать в салоне</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="courier" id="courier" className="text-[#BD8736] border-[#BD8736]" />
                        <Label htmlFor="courier" className="cursor-pointer">Доставка курьером</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {deliveryMethod === 'courier' && (
                    <div className="space-y-2">
                      <Label htmlFor="address">Адрес доставки</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Введите адрес"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Кнопка добавления */}
              <Button 
                className="w-full bg-[#BD8736] hover:bg-[#BD8736]/90" 
                onClick={handleAddGiftCertificate}
                disabled={certificateValue === 'amount' && parseFloat(giftAmount) < 3000}
              >
                Добавить в корзину
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export { List2 };
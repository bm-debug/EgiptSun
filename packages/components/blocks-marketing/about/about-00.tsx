"use client";

import { type SVGProps, useId, useState } from "react";

import { cn } from "@/lib/utils";
import { Container } from "@/components/misc/layout/сontainer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { ChevronDown } from "lucide-react";

interface AboutHero {
  badge?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  button1?: string;
  button2?: string;
}

interface AboutMission {
  quote?: string;
  paragraph1?: string;
  paragraph2?: string;
}

interface AboutValueItem {
  title?: string;
  content?: string;
}

interface AboutValues {
  title?: string;
  items?: AboutValueItem[];
}

interface AboutTeamMember {
  name?: string;
  title?: string;
  imageUrl?: string;
}

interface AboutTeam {
  title?: string;
  description?: string;
  members?: AboutTeamMember[];
}

interface AboutLegal {
  title?: string;
  items?: unknown[];
}

export interface About00Props {
  className?: string;
  hero?: AboutHero;
  mission?: AboutMission;
  values?: AboutValues;
  team?: AboutTeam;
  legal?: AboutLegal;
  imageAlts?: [string, string, string, string];
}

const DEFAULT_IMAGE_ALTS: [string, string, string, string] = [
  "Мастер делает массаж",
  "СПА процедуры",
  "Команда специалистов",
  "Современное оборудование",
];

const About00 = ({ className, hero, mission, values, team, imageAlts }: About00Props) => {
  const alts = imageAlts ?? DEFAULT_IMAGE_ALTS;
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const sections = [
    {
      id: 0,
      title: "Почему стоит доверить свой отдых нам?",
      content: mission?.quote || "Искусство массажа. Наши мастера виртуозно владеют десятками техник: от глубокого спортивного восстановления и классики до лимфодренажных и экзотических ритуалов. Каждое прикосновение индивидуально подобрано, учитывая особенности вашего тела, и направлено на снятие зажимов и возвращение легкости вашему телу.\n\nКомплексные спа-программы. Позвольте себе полноценный побег от реальности. Наши программы — это выверенные сеты из пилингов, скрабов, обертываний и ухода, которые преображают кожу и дарят глубокий релакс. От экспресс-массажа после рабочего дня до комплексных спа-программ на несколько часов, которые решают любые задачи: от снятия зажимов до полной перезагрузки сознания."
    },
    {
      id: 1,
      title: "Натуральность и качество",
      content: mission?.paragraph1 || "Мы используем только органические гипоаллергенные масла и премиальную косметику, которые питают вашу кожу и дарят ощущение обновления.\n\nТермальный комплекс. Почувствуйте мягкое, волшебное тепло нашего хаммама или классический жар сауны. Прогрев мышц перед массажем усиливает эффект в разы, помогая токсинам покинуть организм."
    },
    {
      id: 2,
      title: "Уникальная соляная пещера",
      content: mission?.paragraph2 || "Идеальное завершение любого визита. После сеанса вы сможете отдохнуть в нашей соляной комнате: чистый ионизированный воздух укрепит иммунитет и подарит ощущение морского бриза, не покидая города."
    },
    {
      id: 3,
      title: "Почему выбирают нас?",
      content: "Мы не просто оказываем услуги — мы создаем атмосферу и настроение. В «Солнце Египта» продумана каждая деталь: от аромата натуральных масел до чашки элитного чая после процедур и вкусных восточных полезных сладостей.\n\nВерните себе сияние и внутреннюю энергию. Ваше личное лето начинается здесь!"
    }
  ];

  return (
    <section className={cn("py-32", className)}>
      {/* Hero Section */}
      <section className="relative py-10 md:py-12 lg:py-15">
        <Container className="max-w-5xl">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            {hero?.title ?? "Солнце Египта"}
            {hero?.subtitle ? (
              <>
                <br />
                <span className="text-xl md:text-2xl font-normal text-muted-foreground">
                  {hero.subtitle}
                </span>
              </>
            ) : null}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground md:text-xl text-center">
            {hero?.description ?? "«Солнце Египта» — ваш личный оазис спокойствия в ритме большого города. В суете будней легко потерять связь с собой. Спа-салон «Солнце Египта» создан для того, чтобы вы могли замедлиться, восстановить силы и почувствовать тепло и заботу, которых так часто не хватает. Мы объединили лучшие традиции восточного гостеприимства и современные методики оздоровления в единое пространство комфорта. А тонкие ароматы благовоний и расслабляющая музыка перенесут вас на побережье Красного моря с первых секунд."}
          </p>

        </div>
        {/* Background decoration */}
        <>
          <div className="absolute -inset-40 z-[-1] [mask-image:radial-gradient(circle_at_center,black_0%,black_20%,transparent_80%)]">
            <PlusSigns className="h-full w-full text-foreground/[0.05]" />
          </div>
        </>
        </Container>
      </section>

      {/* Accordion Sections */}
      <section className="py-10 md:py-12 lg:py-15">
        <Container className="max-w-5xl">
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.id} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 md:p-6 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              >
                <h2 className="text-lg md:text-xl font-semibold pr-4">
                  {section.title}
                </h2>
                <ChevronDown 
                  className={cn(
                    "w-5 h-5 md:w-6 md:h-6 text-muted-foreground transition-transform duration-300 flex-shrink-0",
                    expandedSection === section.id && "rotate-180"
                  )}
                />
              </button>
              {expandedSection === section.id && (
                <div className="px-4 pb-4 md:px-6 md:pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-base md:text-lg text-muted-foreground whitespace-pre-line leading-relaxed">
                    {section.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        </Container>
      </section>

      {/* Image Grid Section */}
      <section className="my-5 overflow-x-hidden pb-10 md:my-8 md:pb-12 lg:my-12 lg:pb-15">
        <Container className="max-w-5xl">
          <Carousel opts={{ align: "start" }}>
            <CarouselContent>
              <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/3">
                <div className="relative h-[330px] lg:h-[440px] xl:h-[600px]">
                  <img
                    src="/images/image.svg"
                    alt={alts[0]}
                    className="h-full w-full object-cover"
                  />
                </div>
              </CarouselItem>
              <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/3">
                <div className="relative h-[330px] lg:h-[440px] xl:h-[600px]">
                  <img
                    src="/images/image.svg"
                    alt={alts[1]}
                    className="h-full w-full object-cover"
                  />
                </div>
              </CarouselItem>
              <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/3">
                <div className="relative h-[330px] lg:h-[440px] xl:h-[600px]">
                  <img
                    src="/images/image.svg"
                    alt={alts[2]}
                    className="h-full w-full object-cover"
                  />
                </div>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </Container>
      </section>
    </section>
  );
};

interface PlusSignsProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

const PlusSigns = ({ className, ...props }: PlusSignsProps) => {
  const GAP = 16;
  const STROKE_WIDTH = 1;
  const PLUS_SIZE = 6;
  const id = useId();
  const patternId = `plus-pattern-${id}`;

  return (
    <svg width={GAP * 2} height={GAP * 2} className={className} {...props}>
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={GAP}
          height={GAP}
          patternUnits="userSpaceOnUse"
        >
          <line
            x1={GAP / 2}
            y1={(GAP - PLUS_SIZE) / 2}
            x2={GAP / 2}
            y2={(GAP + PLUS_SIZE) / 2}
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
          />
          <line
            x1={(GAP - PLUS_SIZE) / 2}
            y1={GAP / 2}
            x2={(GAP + PLUS_SIZE) / 2}
            y2={GAP / 2}
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};

export { About00 };

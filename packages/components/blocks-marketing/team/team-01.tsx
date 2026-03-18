"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const teamMembers = [
  {
    name: "Топ-мастер Ихаб",
    title: "Массажист-реабилитолог",
    imageUrl: "/images/EgiptSun/Master-top EgiptSun_1.jpg",
    isTopMaster: true,
    fullDescription: "Опыт работы - более 19 лет. В совершенстве владеет сакральной методикой Египетского массажа — это древняя техника, позволяющая достичь глубокой релаксации и расслабления, которая зародилась в недрах Древнего Египта и передавалась из поколения в поколение как искусство целительства тела и души. \n\nЯ - не просто массажист, я - ваш проводник к здоровью, гармонии и благополучию.",
    features: [
      {
        title: "Что я предлагаю?",
        items: [
          "Освобождение от боли: Боль в спине, шее, плечах? Мигрени? Забудьте об этом! Я использую передовые техники, чтобы снять напряжение в мышцах, улучшить кровообращение и активизировать естественные процессы восстановления организма.",
          "Устранение стресса и тревоги: Современный мир полон вызовов. Позвольте мне растопить накопленный стресс в ваших мышцах. Специальные техники массажа помогут вам расслабиться, нормализовать сон и вернуть ощущение внутренней гармонии.",
          "Восстановление после тренировок: Интенсивные тренировки? Я помогу вашим мышцам быстрее восстановиться, снизить риск травм и повысить эффективность ваших занятий спортом.",
          "Улучшение общего самочувствия: Массаж — это не просто приятная процедура, это инвестиция в ваше здоровье. Он улучшает кровообращение, лимфодренаж, укрепляет иммунитет и повышает жизненный тонус.",
          "Индивидуальный подход: Я внимательно выслушаю ваши пожелания и разработаю индивидуальную программу массажа, которая будет учитывать ваши потребности и особенности."
        ]
      },
      {
        title: "Почему выбирают меня?",
        items: [
          "Опыт и профессионализм: имею многолетний опыт работы и постоянно совершенствую свои знания и навыки.",
          "Внимательное отношение к каждому клиенту: для меня важно, чтобы вы чувствовали себя комфортно и расслабленно во время сеанса.",
          "Гарантированный результат: я помогаю вам решить ваши задачи и улучшить качество вашей жизни.",
          "2002-2006 гг — Александрийский университет физической культуры, Арабская Республика Египет",
          "2006-2007 гг. — Курсы повышения квалификации в Университете Эль-Мансура, Арабская Республика Египет",
          "2021г – по наст. время — Квалификация – Лечебный массаж для реабилитации и физиотерапии",
          "Сертификат об окончании интенсивных курсов по глубокой тканевой массажной терапии — Член Всемирного совета массажа (WMC)",
          "Сертификат об окончании интенсивных курсов мануальной терапии — Международная академия массажа Швейцарии",
          "Сертификат об окончании интенсивных курсов массажной терапии — Международная академия массажа Швейцарии",
          "Ежегодное повышение квалификации"
        ]
      }
    ]
  },
  {
    name: "Петрова Елена",
    title: "СПА-терапевт высшей категории",
    description: "Эксперт по древнеегипетским ритуалам красоты. Автор уникальных методик омоложения. Более 10 лет практики в элитных спа-салонах.",
    imageUrl: "https://images.pexels.com/photos/5495292/pexels-photo-5495292.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    name: "Смирнова Ольга",
    title: "Косметолог-эстетист",
    description: "Специалист по аппаратной и инъекционной косметологии. Регулярно повышает квалификацию в Европе. Индивидуальный подход к каждому клиенту.",
    imageUrl: "https://images.pexels.com/photos/8469521/pexels-photo-8469521.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
];

const TeamMemberCard = ({ member }: { member: typeof teamMembers[0] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

  if (member.isTopMaster) {
    return (
      <div className="text-center group">
        <div className="relative overflow-hidden rounded-lg bg-secondary mb-4">
          <Image
            src={member.imageUrl}
            alt={member.name}
            className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-105"
            width={400}
            height={480}
          />
        </div>
        <h3 
          className="text-xl font-semibold cursor-pointer hover:text-[#BD8736] transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {member.name}
        </h3>
        <p className="text-muted-foreground text-sm mb-3">{member.title}</p>
        
        {isExpanded && (
          <div className="mt-4 p-4 bg-muted rounded-lg text-left animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm leading-relaxed whitespace-pre-line mb-4">
              {member.fullDescription}
            </p>
            
            <div className="space-y-3">
              {member.features?.map((feature, idx) => (
                <div key={idx}>
                  <button
                    className="w-full text-left font-semibold text-sm py-2 px-3 bg-background rounded-md hover:bg-accent transition-colors flex items-center justify-between gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedFeature(expandedFeature === idx ? null : idx);
                    }}
                  >
                    <span>{feature.title}</span>
                    <ChevronDown 
                      className={cn(
                        "w-4 h-4 transition-transform duration-300",
                        expandedFeature === idx && "rotate-180"
                      )}
                    />
                  </button>
                  {expandedFeature === idx && (
                    <ul className="mt-2 space-y-2 pl-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      {feature.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-[#BD8736] mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-muted rounded-lg text-center">
              <p className="text-sm leading-relaxed">
                Позвольте себе быть здоровыми, счастливыми и энергичными! Ваше тело скажет вам спасибо!
              </p>
            </div>
          </div>
        )}
        
        <div className="mt-2 flex justify-center">
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform duration-300 cursor-pointer",
              isExpanded && "rotate-180"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="text-center group">
      <div className="relative overflow-hidden rounded-lg bg-secondary mb-4">
        <Image
          src={member.imageUrl}
          alt={member.name}
          className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-105"
          width={400}
          height={480}
        />
      </div>
      <h3 className="text-xl font-semibold">{member.name}</h3>
      <p className="text-muted-foreground text-sm mb-3">{member.title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{(member as any).description}</p>
    </div>
  );
};

const Team01Page = () => {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-xl mx-auto">
        <h2 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tighter">
          Наши специалисты
        </h2>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground">
          Профессионалы своего дела с многолетним опытом работы
        </p>
      </div>

      <div className="mt-20 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-(--breakpoint-lg) mx-auto">
        {teamMembers.map((member) => (
          <TeamMemberCard key={member.name} member={member} />
        ))}
      </div>
    </div>
  );
};

export default Team01Page;

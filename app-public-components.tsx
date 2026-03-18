import React from "react";
import { Navbar } from "./packages/components/blocks-marketing/navbar/navbar";
import Hero07 from "./packages/components/blocks-marketing/hero/hero-07";
import FooterSection from "./packages/components/blocks-marketing/footer/footer-00";
import { About00, type About00Props } from "./packages/components/blocks-marketing/about/about-00";
import Team01Page from "./packages/components/blocks-marketing/team/team-01";
import { HeroHeader } from "./packages/components/blocks-marketing/header";
import { BookingForm } from "./packages/components/blocks-marketing/booking-form";
import { ScrollToTopFloating, ChatFloating } from "./packages/components/blocks-marketing/footer/footer-floating-actions";
import { List2 } from "./packages/components/blocks-marketing/EgiptSun/List";
import { Testimonial19 } from "./packages/components/blocks-marketing/EgiptSun/Testimonials_19.tsx";






export type PublicPageComponent = (props?: Record<string, unknown>) => React.JSX.Element;
export type PubliPagesComponent = Record<string, PublicPageComponent>;

function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Navbar />
      <div className="flex-1 min-w-0">{children}</div>
      <FooterSection />
      <ScrollToTopFloating />
      <ChatFloating />
    </div>
  );
}

function PageWithTitle({ title, description }: { title?: string; description?: string }) {
  return (
    <section className="container py-12">
      {title ? <h1 className="text-2xl font-semibold">{title}</h1> : null}
      {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
    </section>
  );
}

export const PUBLIC_PAGES_COMPONENTS: PubliPagesComponent = {
  home: (props) => (
    <SiteLayout>
      <Hero07 />
      <section id="about">
        <About00 
          {...(props as About00Props)}
          hero={{
            badge: "О салоне",
            title: "Солнце Египта",
            subtitle: "Откройте тайны древнего Египта в каждом прикосновении!",
            description: ""
          }}
          mission={{
            quote: "Искусство массажа. Наши мастера виртуозно владеют десятками техник: от глубокого спортивного восстановления и классики до лимфодренажных и экзотических ритуалов. Каждое прикосновение индивидуально подобрано, учитывая особенности вашего тела, и направлено на снятие зажимов и возвращение легкости вашему телу.\n\nКомплексные спа-программы. Позвольте себе полноценный побег от реальности. Наши программы — это выверенные сеты из пилингов, скрабов, обертываний и ухода, которые преображают кожу и дарят глубокий релакс. От экспресс-массажа после рабочего дня до комплексных спа-программ на несколько часов, которые решают любые задачи: от снятия зажимов до полной перезагрузки сознания.",
            paragraph1: "Мы используем только органические гипоаллергенные масла и премиальную косметику, которые питают вашу кожу и дарят ощущение обновления.\n\nТермальный комплекс. Почувствуйте мягкое, волшебное тепло нашего хаммама или классический жар сауны. Прогрев мышц перед массажем усиливает эффект в разы, помогая токсинам покинуть организм.",
            paragraph2: "Идеальное завершение любого визита. После сеанса вы сможете отдохнуть в нашей соляной комнате: чистый ионизированный воздух укрепит иммунитет и подарит ощущение морского бриза, не покидая города."
          }}
          values={{
            items: [
              { title: "Профессионализм", content: "" },
              { title: "Качество", content: "" },
              { title: "Атмосфера", content: "" },
              { title: "Забота", content: "" },
            ]
          }}
        />
      </section>
      <div id="team">
        <Team01Page />
      </div>
      <List2 heading="Наши услуги" id="services" />
      <Testimonial19 />
    </SiteLayout>
  ),
  about: (props) => (
    <SiteLayout>
      <About00 {...(props as About00Props)} />
    </SiteLayout>
  ),
  ads: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "affiliate-program": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  appointment: (props) => (
    <SiteLayout>
      <div className="container py-12">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Запись на процедуры</h1>
          <p className="text-muted-foreground text-lg">
            Выберите удобную услугу и время для посещения нашего спа-салона
          </p>
        </div>
        <BookingForm />
      </div>
    </SiteLayout>
  ),
  blog: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  cart: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  catalog: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  certificates: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  checkout: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "coming-soon": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  compare: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  contact: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  csr: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "email-confirmation": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  events: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  faq: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  franchise: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  gallery: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  history: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  investors: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  jobs: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "knowledge-base": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  legal: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  locations: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "loyalty-program": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  news: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  objects: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "password-recovery": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  press: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  prices: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  projects: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  promotions: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  search: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  services: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "sign-in": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "sign-up": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  sitemap: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "system-status": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  team: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  tenders: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  testimonials: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "thank-you": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "under-construction": (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  unsubscribe: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  vendors: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  video: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  wholesale: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  wishlist: (props) => (
    <SiteLayout>
      <PageWithTitle title={(props as { title?: string })?.title} description={(props as { description?: string })?.description} />
    </SiteLayout>
  ),
  "404": () => (
    <SiteLayout>
      <section className="container flex min-h-[50vh] flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-semibold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
      </section>
    </SiteLayout>
  ),
};

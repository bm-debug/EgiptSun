import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Service {
  name: string;
  duration: string;
  price: number;
}

const MASSAGE_SERVICES: Service[] = [
  { name: "Египетский массаж тела (90 мин.)", duration: "90 мин.", price: 4900 },
  { name: "Египетский массаж тела (60 мин.)", duration: "60 мин.", price: 3500 },
  { name: "Египетский массаж лица", duration: "40 мин.", price: 2900 },
  { name: "Египетский массаж спины", duration: "40 мин.", price: 2500 },
  { name: "Египетский массаж ног и ступней", duration: "40 мин.", price: 2500 },
  { name: "Египетский массаж головы", duration: "30 мин.", price: 1900 },
  { name: "Египетский массаж шейно-воротниковой зоны", duration: "30 мин.", price: 1900 },
];

const SPA_SERVICES: Service[] = [
  { name: "Египетская СПА программа Бастет леди", duration: "180 мин.", price: 8900 },
  { name: "Египетская СПА программа Клеопатра", duration: "150 мин.", price: 7500 },
  { name: "Египетская СПА программа Солнце Египта", duration: "120 мин.", price: 5900 },
  { name: "Египетская СПА программа Нефертити", duration: "90 мин.", price: 4900 },
];

interface ServicesProps {
  className?: string;
  id?: string;
}

export function Services({ className, id }: ServicesProps) {
  return (
    <section id={id} className={cn("py-20 bg-muted/50", className)}>
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Наши услуги</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Древнеегипетские процедуры красоты и оздоровления в современном исполнении
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Спа программы */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">СПА программы</CardTitle>
              <CardDescription>
                Комплексные процедуры для тела и души
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SPA_SERVICES.map((service, index) => (
                <div key={index} className="flex justify-between items-start border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <h3 className="font-medium">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.duration}</p>
                  </div>
                  <span className="font-semibold whitespace-nowrap ml-4">
                    {service.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Массаж */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Массаж</CardTitle>
              <CardDescription>
                Традиционные египетские техники массажа
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MASSAGE_SERVICES.map((service, index) => (
                <div key={index} className="flex justify-between items-start border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <h3 className="font-medium">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.duration}</p>
                  </div>
                  <span className="font-semibold whitespace-nowrap ml-4">
                    {service.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

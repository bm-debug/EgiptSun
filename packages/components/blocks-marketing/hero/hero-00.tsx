import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

import { Container } from "@/components/misc/layout/сontainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface HeroContent {
  badge?: string;
  title?: string;
  description?: string;
  button1?: string;
  button2?: string;
}

interface Hero00Props {
  hero?: HeroContent | null;
  className?: string;
}

const Hero00 = ({ hero, className }: Hero00Props) => {
  const badge = hero?.badge ?? "";
  const title = hero?.title ?? "";
  const description = hero?.description ?? "";
  const button1 = hero?.button1 ?? "";
  const button2 = hero?.button2 ?? "";

  return (
    <section className={cn("relative py-32", className)}>
      <Container>
        <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(var(--primary)_1px,transparent_1px)] [background-size:20px_20px] opacity-25" />

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            {badge ? (
              <Badge
                variant="outline"
                className="mb-6 bg-background px-4 py-1.5 text-sm"
              >
                {badge} <Sparkles className="ml-1 size-3.5" />
              </Badge>
            ) : null}

            {title ? (
              <h1 className="bg-gradient-to-r font-heading from-foreground to-foreground/70 bg-clip-text pb-3 text-5xl font-bold text-transparent md:text-6xl lg:text-7xl">
                {title}
              </h1>
            ) : null}

            {description ? (
              <p className="mt-6 max-w-xl text-xl text-muted-foreground">
                {description}
              </p>
            ) : null}

            {(button1 || button2) ? (
              <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
                {button1 ? (
                  <Button size="lg" className="w-full sm:w-auto" asChild>
                    <a href="#contact">{button1}</a>
                  </Button>
                ) : null}
                {button2 ? (
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                    <a href="#about">{button2}</a>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
};

export { Hero00 };

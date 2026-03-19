import AnimatedGridPattern from "@/components/ui/animated-grid-pattern";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/misc/layout/сontainer";
import { cn } from "@/lib/utils";
import Link from "next/link";

const Hero07 = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedGridPattern
        numSquares={30}
        maxOpacity={0.1}
        duration={3}
        className={cn(
          "pointer-events-none absolute inset-0",
          "mask-[radial-gradient(500px_circle_at_center,white,transparent)]",
          "skew-y-12",
        )}
      />
      <Container className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="w-full max-w-3xl text-center">
          <div className="relative inline-block">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl md:leading-[1.2] font-semibold tracking-tight">
              Солнце Египта
            </h1>
            <p className="absolute -top-8 right-0 md:text-lg text-muted-foreground font-medium whitespace-nowrap">
              Спа-салон
            </p>
          </div>
          <p className="mt-6 md:text-2xl text-muted-foreground font-medium tracking-wide">
            Ваш личный оазис спокойствия в ритме большого города
          </p>
          <div className="mt-12 flex items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full text-base bg-[#BD8736] hover:bg-[#BD8736]/90"
              asChild
            >
              <Link href="#services">Записаться</Link>
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Hero07;

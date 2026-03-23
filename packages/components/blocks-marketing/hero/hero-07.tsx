import { Button } from "@/components/ui/button";
import Link from "next/link";

const Hero07 = () => {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden pt-20"
      style={{
        backgroundImage: "url('/images/EgiptSun_hero_img-1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative z-10 text-center max-w-3xl text-white">
        <div className="relative inline-block">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl md:leading-[1.2] font-semibold tracking-tight"
            style={{ textShadow: '-2px 2px 8px rgba(0,0,0,0.55)' }}
          >
            Солнце Египта
          </h1>
          <p className="absolute -top-8 right-0 md:text-lg text-white/80 font-medium whitespace-nowrap" style={{ textShadow: '-2px 2px 8px rgba(0,0,0,0.55)' }}>
            Спа-салон
          </p>
        </div>
        <p className="mt-6 md:text-2xl text-white/90 font-medium tracking-wide" style={{ textShadow: '-2px 2px 8px rgba(0,0,0,0.55)' }}>
          Ваш личный оазис спокойствия в ритме большого города
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            size="lg"
            className="rounded-full text-base bg-[#BD8736] hover:bg-[#BD8736]/90 text-white border-2 border-white/60 shadow-lg shadow-black/40 px-10"
            asChild
          >
            <Link href="#services">
              Записаться
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Hero07;

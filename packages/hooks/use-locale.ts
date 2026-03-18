import { useParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export function useLocale() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const locale = (params.locale as string) || "en";

  const setLocale = useCallback(
    (newLocale: string) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("static-locale", newLocale);
      }
      const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
      const newPath = `/${newLocale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`;
      window.location.href = newPath;
    },
    [pathname, router],
  );

  return { locale, setLocale };
}

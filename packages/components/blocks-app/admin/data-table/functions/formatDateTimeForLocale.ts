
export function formatDateTimeForLocale(value: any, locale: string): string {
    if (!value) return "-"
    try {
      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
  
      const loc = locale === "ru" ? "ru-RU" : locale === "rs" ? "sr-RS" : "en-US"
      return new Intl.DateTimeFormat(loc, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch {
      return String(value)
    }
  }
  
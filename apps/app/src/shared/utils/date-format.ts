/**
 * Formats an ISO date string to local date and time based on user's locale and timezone
 * Uses browser's Intl.DateTimeFormat to format dates in user's local timezone
 */
export function formatLocalDateTime(isoString: string | null | undefined, locale?: string): string {
  if (!isoString) return ""
  
  try {
    // Get locale from localStorage or use provided/default
    let userLocale = locale
    if (!userLocale && typeof window !== "undefined") {
      const savedLocale = localStorage.getItem("sidebar-locale")
      if (savedLocale) {
        userLocale = savedLocale
      }
    }
    
    // Default locale fallback
    if (!userLocale) {
      userLocale = "en"
    }
    
    // Map locale codes to Intl locale strings
    const localeMap: Record<string, string> = {
      en: "en-US",
      ru: "ru-RU",
      rs: "sr-RS",
    }
    
    const intlLocale = localeMap[userLocale] || "en-US"
    
    const date = new Date(isoString)
    
    // Format date and time in user's local timezone
    const formatter = new Intl.DateTimeFormat(intlLocale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    
    return formatter.format(date)
  } catch (error) {
    console.error("Failed to format date:", error)
    // Fallback to simple format
    return String(isoString)
      .replace("T", " ")
      .replace(/\.\d+(Z)?$/, "")
      .replace(/Z$/, "")
  }
}




export const formatDate = (dateString: string | Date) => {
  let date
  if(dateString instanceof Date){
    date = dateString
  } else {
    date = new Date(dateString);

  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};
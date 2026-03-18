import type { altrpUser } from "@/shared/types/altrp"
import { MeRepository } from "@/shared/repositories/me.repository"
import { PROJECT_SETTINGS } from "@/settings"

/**
 * Gets user language preference from database
 * Checks human.dataIn.language first, then user.dataIn.language
 * Falls back to default language from settings.ts
 */
export async function getUserLanguage(user: altrpUser): Promise<string> {
  try {
    // Try to get user with human data
    const meRepo = MeRepository.getInstance()
    const userWithRoles = await meRepo.findByIdWithRoles(Number(user.id))
    
    if (userWithRoles?.human?.dataIn) {
      const humanDataIn = typeof userWithRoles.human.dataIn === 'string' 
        ? JSON.parse(userWithRoles.human.dataIn) 
        : userWithRoles.human.dataIn
      
      if (humanDataIn?.language && typeof humanDataIn.language === 'string') {
        return humanDataIn.language
      }
    }
    
    // Fallback to user.dataIn
    if (user.dataIn) {
      const userDataIn = typeof user.dataIn === 'string' 
        ? JSON.parse(user.dataIn) 
        : user.dataIn
      
      if (userDataIn?.language && typeof userDataIn.language === 'string') {
        return userDataIn.language
      }
    }
  } catch (error) {
    console.error('Failed to get user language:', error)
  }
  
  // Return default language from settings
  return PROJECT_SETTINGS.defaultLanguage
}

/**
 * Parses Accept-Language header and returns first supported language
 * Falls back to default language from settings.ts
 */
export function parseAcceptLanguage(acceptLanguage: string | null | undefined): string {
  if (!acceptLanguage) {
    return PROJECT_SETTINGS.defaultLanguage
  }
  
  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,ru;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const parts = lang.trim().split(';')
      return {
        code: parts[0].split('-')[0].toLowerCase(),
        quality: parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0,
      }
    })
    .sort((a, b) => b.quality - a.quality)
  
  // Check for supported languages (ru, rs, en)
  const supportedLanguages = ['ru', 'rs', 'en']
  for (const lang of languages) {
    if (supportedLanguages.includes(lang.code)) {
      return lang.code
    }
  }
  
  return PROJECT_SETTINGS.defaultLanguage
}




export const PROJECT_SETTINGS = {
  name: 'Altrp',
  description: 'The first truly open operating system for SMBs. Combine a rock-solid digital foundation with AI agents and modular plugins while maintaining total data and API sovereignty.',
  defaultLanguage: 'en',
  defaultTheme: 'light' as 'light' | 'dark',
  supportedThemes: ['light', 'dark',],
  logoVersion: 1,
  dateRangeDisplayFormat: 'dd.MM.yy',
} as const;

export const LAYOUT_CONFIG = {
  ContainerWidth: '1280px',
} as const;

export const LANGUAGES = [
  { code: 'en', name: 'English', shortName: 'EN' },
  // { code: 'zh', name: '中文', shortName: 'CN' },
  // { code: 'hi', name: 'हिन्दी', shortName: 'IN' },
  // { code: 'es', name: 'Español', shortName: 'ES' },
  // { code: 'fr', name: 'Français', shortName: 'FR' },
  { code: 'ar', name: 'العربية', shortName: 'AR' },
  // { code: 'pt', name: 'Português', shortName: 'PT' },
  { code: 'ru', name: 'Русский', shortName: 'RU' },
  // { code: 'ja', name: '日本語', shortName: 'JP' },
  // { code: 'de', name: 'Deutsch', shortName: 'DE' },
  // { code: 'ko', name: '한국어', shortName: 'KR' },
  // { code: 'it', name: 'Italiano', shortName: 'IT' },
  // { code: 'rs', name: 'Srpski', shortName: 'RS' },
] as const;

/** Language code from LANGUAGES (available locales in project settings) */
export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const SUPPORTED_LANGUAGES: string[] = LANGUAGES.map(lang => lang.code);

/** Locales that use right-to-left layout (e.g. Arabic, Hebrew) */
export const RTL_LOCALES: readonly string[] = ["ar"];

// Private role-based routes that don't use locale prefix (from (private) folder)
export const PRIVATE_ROLE_ROUTES = [
  'a', // admin alternative routes
  'c', // consumer routes
  'd', // dealer routes
  'e', // editor routes
  'i', // investor routes
  'm', // manager routes
  'p', // partner routes
  's', // storekeeper routes
  't', // task routes
] 

export const CMS_PROVIDER: 'mdx' | 'sqlite' = 'sqlite'

export const APP_DB_CLIENT: 'sqlite' | 'postgres' = 'sqlite'
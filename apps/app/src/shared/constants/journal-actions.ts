/**
 * Mapping of journal action types to human-readable names in Russian
 */
export const JOURNAL_ACTION_NAMES: Record<string, string> = {
  'USER_JOURNAL_LOGIN': 'Вход в систему',
  'USER_JOURNAL_LOGOUT': 'Выход из системы',
  'USER_JOURNAL_REGISTRATION': 'Регистрация',
  'USER_JOURNAL_EMAIL_VERIFICATION': 'Подтверждение email',
  'USER_JOURNAL_PASSWORD_RESET_REQUEST': 'Запрос сброса пароля',
  'USER_JOURNAL_PASSWORD_RESET_CONFIRM': 'Подтверждение сброса пароля',
  'USER_JOURNAL_PASSWORD_RESET': 'Сброс пароля',
  'USER_JOURNAL_SELFIE_VERIFICATION': 'Верификация селфи с паспортом',
  'USER_JOURNAL_WALLET_DEPOSIT': 'Пополнение кошелька',
  'USER_JOURNAL_FINANCE_PAID': 'Гашение платежа',
  'USER_JOURNAL_SUPPORT_CHAT_CREATED': 'Создан чат поддержки',
  'USER_JOURNAL_ADMIN_OCR_OVERRIDE': 'Ручная правка OCR данных админом',
  'LOAN_APPLICATION_SNAPSHOT': 'Заявка на рассрочку',
  'DEAL_STATUS_CHANGE': 'Изменение статуса заявки',
  'DEAL_APPROVED': 'Одобрение заявки',
  'DEAL_REJECTED': 'Отклонение заявки',
  'DEAL_CANCELLED': 'Отмена заявки',
  'INVESTOR_REGISTERED': 'Новый инвестор',
  'PAYMENT_RECEIVED': 'Получен платеж',
  'USER_PAGE_VIEW': 'Посещение страницы',
} as const

/**
 * Get human-readable name for a journal action type
 */
export function getJournalActionName(action: string): string {
  return JOURNAL_ACTION_NAMES[action] || action
}

/**
 * List of action types for filter dropdowns
 * Includes 'all' option and all available action types
 */
export const JOURNAL_ACTION_FILTER_OPTIONS = [
  { value: 'all', label: 'Все типы' },
  ...Object.entries(JOURNAL_ACTION_NAMES).map(([value, label]) => ({
    value,
    label,
  })),
] as const


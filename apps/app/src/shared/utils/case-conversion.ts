/**
 * Convert camelCase to snake_case for database column names
 * 
 * @param str - String in camelCase format
 * @returns String in snake_case format
 * 
 * @example
 * camelToSnake("dataIn") // "data_in"
 * camelToSnake("DataIn") // "data_in"
 * camelToSnake("data_in") // "data_in" (unchanged)
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter, index) => (index > 0 ? '_' : '') + letter.toLowerCase())
}

import { COLLECTION_GROUPS } from "@/shared/collections"

/**
 * Check if a collection name exists in COLLECTION_GROUPS
 * 
 * @param name - Collection name to validate
 * @returns true if collection exists in COLLECTION_GROUPS, false otherwise
 * 
 * @example
 * isValidCollection("users") // true
 * isValidCollection("invalid_collection") // false
 */
export function isValidCollection(name: string): boolean {
  const all = Object.values(COLLECTION_GROUPS).flat()
  return all.includes(name)
}

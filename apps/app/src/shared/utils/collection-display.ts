/**
 * Converts collection name to taxonomy entity key for translation lookup.
 */
export function collectionToEntityKey(collection: string): string {
  const specialCases: Record<string, string> = {
    roles: "role",
    echelon_employees: "employee_echelon",
    product_variants: "product_variant",
    asset_variants: "asset_variant",
    text_variants: "text_variant",
    wallet_transactions: "wallet_transaction",
    base_moves: "base_move",
    base_move_routes: "base_move_route",
    message_threads: "message_thread",
    outreach_referrals: "outreach_referral",
    echelons: "employee_echelon",
    employee_timesheets: "employee_timesheet",
    employee_leaves: "employee_leave",
    journal_generations: "journal_generation",
    journal_connections: "journal_connection",
    user_sessions: "user_session",
    user_bans: "user_ban",
    user_verifications: "user_verification",
    role_permissions: "role_permission",
  }
  if (specialCases[collection]) {
    return specialCases[collection]
  }
  if (collection.endsWith("ies")) {
    return collection.slice(0, -3) + "y"
  }
  if (collection.endsWith("es") && !collection.endsWith("ses")) {
    return collection.slice(0, -2)
  }
  if (collection.endsWith("s")) {
    return collection.slice(0, -1)
  }
  return collection
}

/**
 * Converts collection name (snake_case) to human-readable label (Title Case).
 */
export function formatCollectionToDisplayLabel(collection: string): string {
  return collection
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

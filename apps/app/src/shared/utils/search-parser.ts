/**
 * Search query parser for multi-search with quotes and AND/OR operators
 * 
 * Supports:
 * - Exact phrases in quotes: "exact phrase"
 * - AND operator: value1 AND value2
 * - OR operator: value1 OR value2
 * - Combination: "phrase 1" AND value2 OR "phrase 3"
 * 
 * Default operator when not specified: OR (between conditions)
 * AND has higher priority than OR
 */

export type SearchCondition = {
  type: 'exact' | 'word'
  value: string
  operator?: 'AND' | 'OR'
}

export type ParsedSearchQuery = {
  conditions: SearchCondition[]
  defaultOperator: 'AND' | 'OR' // if operators are not explicitly specified
}

/**
 * Parse a search query string into structured conditions
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  console.log('parseSearchQuery', query)
  if (!query || query.trim() === '') {
    return { conditions: [], defaultOperator: 'OR' }
  }

  const conditions: SearchCondition[] = []
  let currentIndex = 0
  const queryLength = query.length

  while (currentIndex < queryLength) {
    // Skip whitespace
    while (currentIndex < queryLength && /\s/.test(query[currentIndex])) {
      currentIndex++
    }
    if (currentIndex >= queryLength) break

    // Check for quoted phrase
    if (query[currentIndex] === '"') {
      currentIndex++ // Skip opening quote
      const startIndex = currentIndex
      
      // Find closing quote
      while (currentIndex < queryLength && query[currentIndex] !== '"') {
        currentIndex++
      }
      
      if (currentIndex < queryLength) {
        const phrase = query.substring(startIndex, currentIndex).trim()
        if (phrase) {
          conditions.push({
            type: 'exact',
            value: phrase
          })
        }
        currentIndex++ // Skip closing quote
      } else {
        // Unclosed quote - treat rest as phrase
        const phrase = query.substring(startIndex).trim()
        if (phrase) {
          conditions.push({
            type: 'exact',
            value: phrase
          })
        }
        break
      }
    } else {
      // Regular word or operator
      const startIndex = currentIndex
      
      // Find end of word (whitespace or quote)
      while (currentIndex < queryLength && 
             !/\s/.test(query[currentIndex]) && 
             query[currentIndex] !== '"') {
        currentIndex++
      }
      
      const word = query.substring(startIndex, currentIndex).trim()
      
      if (word) {
        const upperWord = word.toUpperCase()
        
        // Check if it's an operator
        if (upperWord === 'AND' || upperWord === 'OR') {
          // Set operator for previous condition
          if (conditions.length > 0) {
            conditions[conditions.length - 1].operator = upperWord as 'AND' | 'OR'
          }
        } else {
          // Regular word
          conditions.push({
            type: 'word',
            value: word
          })
        }
      }
    }
  }
  console.log('parseSearchQuery', {
    conditions,
    defaultOperator: 'OR'
  })

  return {
    conditions,
    defaultOperator: 'OR'
  }
}

/**
 * Check if a text matches the search conditions
 */
export function matchesSearchQuery(text: string, query: ParsedSearchQuery, caseSensitive: boolean = false): boolean {
  if (query.conditions.length === 0) {
    return true
  }

  const searchText = caseSensitive ? text : text.toLowerCase()

  // Helper to check if a single condition matches
  const conditionMatches = (cond: SearchCondition): boolean => {
    const condValue = caseSensitive ? cond.value : cond.value.toLowerCase()
    if (cond.type === 'exact') {
      return searchText.includes(condValue)
    } else {
      // Word search - match whole word or part of word
      return searchText.includes(condValue)
    }
  }

  // Group conditions by operators
  // Process AND groups first (higher priority), then combine with OR
  // Operator on a condition means the operator between this condition and the next one
  const groups: SearchCondition[][] = []
  let currentGroup: SearchCondition[] = []

  for (let i = 0; i < query.conditions.length; i++) {
    const condition = query.conditions[i]
    const nextCondition = query.conditions[i + 1]
    
    // Add condition to current group (without operator - operator is metadata)
    const conditionWithoutOperator: SearchCondition = {
      type: condition.type,
      value: condition.value
    }
    currentGroup.push(conditionWithoutOperator)

    // Check if we should end current group:
    // 1. If current condition has OR operator - end group after this condition (OR means next group starts)
    // 2. If next condition has OR operator - end group before next  
    // 3. If this is the last condition - end group
    const shouldEndGroup = 
      condition.operator === 'OR' ||
      (nextCondition && nextCondition.operator === 'OR') ||
      i === query.conditions.length - 1

    if (shouldEndGroup) {
      if (currentGroup.length > 0) {
        groups.push([...currentGroup])
      }
      currentGroup = []
    }
  }

  // If no groups were created, create one with all conditions (means no operators)
  if (groups.length === 0 && query.conditions.length > 0) {
    groups.push(query.conditions.map(c => ({ type: c.type, value: c.value })))
  }

  // Evaluate each group (AND logic within group - all conditions in group must match)
  const groupResults = groups.map(group => {
    return group.every(cond => conditionMatches(cond))
  })

  // Combine groups with OR logic (at least one group must match)
  if (groupResults.length === 0) {
    return true
  }
  return groupResults.some(result => result === true)
}

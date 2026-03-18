import * as React from "react"

export function useDataTableColumnOrder(collection: string) {
  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => {
    if (typeof window !== "undefined" && collection) {
      try {
        const saved = localStorage.getItem(`column-order-${collection}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            return parsed
          }
        }
      } catch (e) {
        console.warn("Failed to restore column order from localStorage:", e)
      }
    }
    return []
  })

  React.useEffect(() => {
    if (collection && typeof window !== "undefined" && columnOrder.length > 0) {
      try {
        localStorage.setItem(`column-order-${collection}`, JSON.stringify(columnOrder))
      } catch (e) {
        console.warn("Failed to save column order:", e)
      }
    }
  }, [columnOrder, collection])

  return { columnOrder, setColumnOrder }
}

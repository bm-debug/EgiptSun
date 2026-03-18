import * as React from "react"

export function useDataTableCardViewSettings(collection: string) {
  const [cardViewModeMobile, setCardViewModeMobile] = React.useState<boolean>(() => {
    if (typeof window !== "undefined" && collection) {
      try {
        const saved = localStorage.getItem(`card-view-mode-mobile-${collection}`)
        if (saved !== null) {
          return JSON.parse(saved) === true
        }
      } catch (e) {
        console.warn("Failed to restore card view mode mobile from localStorage:", e)
      }
    }
    return true // Default: card view for mobile
  })

  const [cardViewModeDesktop, setCardViewModeDesktop] = React.useState<boolean>(() => {
    if (typeof window !== "undefined" && collection) {
      try {
        const saved = localStorage.getItem(`card-view-mode-desktop-${collection}`)
        if (saved !== null) {
          return JSON.parse(saved) === true
        }
      } catch (e) {
        console.warn("Failed to restore card view mode desktop from localStorage:", e)
      }
    }
    return false // Default: table view
  })

  const [cardsPerRow, setCardsPerRow] = React.useState<number>(() => {
    if (typeof window !== "undefined" && collection) {
      try {
        const saved = localStorage.getItem(`cards-per-row-${collection}`)
        if (saved !== null) {
          const value = parseInt(saved, 10)
          if (value >= 1 && value <= 6) {
            return value
          }
        }
      } catch (e) {
        console.warn("Failed to restore cards per row from localStorage:", e)
      }
    }
    return 3 // Default: 3 cards per row on desktop
  })

  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(`card-view-mode-mobile-${collection}`)
      if (saved !== null) {
        setCardViewModeMobile(JSON.parse(saved) === true)
      } else {
        setCardViewModeMobile(true)
      }
    } catch (e) {
      console.warn("Failed to restore card view mode mobile:", e)
      setCardViewModeMobile(true)
    }
  }, [collection])

  React.useEffect(() => {
    if (collection && typeof window !== "undefined") {
      try {
        localStorage.setItem(`card-view-mode-mobile-${collection}`, JSON.stringify(cardViewModeMobile))
      } catch (e) {
        console.warn("Failed to save card view mode mobile to localStorage:", e)
      }
    }
  }, [cardViewModeMobile, collection])

  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(`card-view-mode-desktop-${collection}`)
      if (saved !== null) {
        setCardViewModeDesktop(JSON.parse(saved) === true)
      } else {
        setCardViewModeDesktop(false)
      }
    } catch (e) {
      console.warn("Failed to restore card view mode desktop:", e)
      setCardViewModeDesktop(false)
    }
  }, [collection])

  React.useEffect(() => {
    if (collection && typeof window !== "undefined") {
      try {
        localStorage.setItem(`card-view-mode-desktop-${collection}`, JSON.stringify(cardViewModeDesktop))
      } catch (e) {
        console.warn("Failed to save card view mode desktop to localStorage:", e)
      }
    }
  }, [cardViewModeDesktop, collection])

  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(`cards-per-row-${collection}`)
      if (saved !== null) {
        const value = parseInt(saved, 10)
        if (value >= 1 && value <= 6) {
          setCardsPerRow(value)
        } else {
          setCardsPerRow(3)
        }
      } else {
        setCardsPerRow(3)
      }
    } catch (e) {
      console.warn("Failed to restore cards per row:", e)
      setCardsPerRow(3)
    }
  }, [collection])

  React.useEffect(() => {
    if (collection && typeof window !== "undefined") {
      try {
        localStorage.setItem(`cards-per-row-${collection}`, String(cardsPerRow))
      } catch (e) {
        console.warn("Failed to save cards per row to localStorage:", e)
      }
    }
  }, [cardsPerRow, collection])

  React.useEffect(() => {
    if (!collection || typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(`cards-per-row-${collection}`)
      if (saved !== null) {
        const value = parseInt(saved, 10)
        if (value >= 1 && value <= 6) {
          setCardsPerRow(value)
        } else {
          setCardsPerRow(3)
        }
      } else {
        setCardsPerRow(3)
      }
    } catch (e) {
      console.warn("Failed to restore cards per row:", e)
      setCardsPerRow(3)
    }
  }, [collection])

  React.useEffect(() => {
    if (collection && typeof window !== "undefined") {
      try {
        localStorage.setItem(`cards-per-row-${collection}`, String(cardsPerRow))
      } catch (e) {
        console.warn("Failed to save cards per row to localStorage:", e)
      }
    }
  }, [cardsPerRow, collection])

  return {
    cardViewModeMobile,
    setCardViewModeMobile,
    cardViewModeDesktop,
    setCardViewModeDesktop,
    cardsPerRow,
    setCardsPerRow,
  }
}

import * as React from "react"

type UseDataTableSearchInputParams = {
  collection: string
  search: string
  setState: React.Dispatch<React.SetStateAction<any>>
}

type UseDataTableSearchInputResult = {
  searchInput: string
  setSearchInput: React.Dispatch<React.SetStateAction<string>>
}

export function useDataTableSearchInput({
  collection,
  search,
  setState,
}: UseDataTableSearchInputParams): UseDataTableSearchInputResult {
  const [searchInput, setSearchInput] = React.useState(search)

  // Sync searchInput with state.search when collection changes
  React.useEffect(() => {
    setSearchInput(search)
  }, [collection])

  // Debounce search input and update state
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setState((prev: any) => {
          return({
            ...prev,
            search: searchInput,
            page: 1, // Reset to first page when search changes
          })
        })
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [searchInput, search, setState])

  return { searchInput, setSearchInput }
}

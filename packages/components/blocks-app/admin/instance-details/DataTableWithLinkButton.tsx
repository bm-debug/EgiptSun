import React from "react"
import { DataTable } from "../data-table"

export function DataTableWithLinkButton({ onLinkClick }: { onLinkClick: () => void }) {
    const ContainerRef = React.useRef<HTMLDivElement>(null)
    
    React.useEffect(() => {
      if (!ContainerRef.current) return
      
      const insertButton = () => {
        // Find the Container with buttons (ml-auto class)
        const buttonsContainer = ContainerRef.current?.querySelector('.ml-auto.flex.items-center') as HTMLElement
        if (!buttonsContainer) return
        
        // Check if button already exists
        if (buttonsContainer.querySelector('[data-link-button]')) return
        
        // Find the "Add" button - look for button that contains "+" or "Добавить" or "Add" text
        // and is a direct child or in a direct child div of buttonsContainer
        const allElements = Array.from(buttonsContainer.children)
        let addButton: HTMLElement | null = null
        
        // Look through direct children
        for (const child of allElements) {
          if (child.tagName === 'BUTTON') {
            const btn = child as HTMLElement
            const text = btn.textContent || ''
            const hasPlus = text.includes('+') || text.includes('Добавить') || text.includes('Add')
            if (hasPlus) {
              addButton = btn
              break
            }
          } else if (child.tagName === 'DIV') {
            // Check if it contains a button with plus
            const btn = child.querySelector('button') as HTMLElement
            if (btn) {
              const text = btn.textContent || ''
              const hasPlus = text.includes('+') || text.includes('Добавить') || text.includes('Add')
              if (hasPlus) {
                addButton = btn
                break
              }
            }
          }
        }
        
        // Fallback: find last button in Container
        if (!addButton) {
          const lastButton = buttonsContainer.querySelector('button:last-of-type') as HTMLElement
          if (lastButton) {
            addButton = lastButton
          }
        }
        
        if (!addButton) return
        
        // Get the parent of addButton (should be buttonsContainer or a direct child)
        const addButtonParent = addButton.parentElement
        if (!addButtonParent) return
        
        // Create button element
        const buttonElement = document.createElement('button')
        buttonElement.setAttribute('data-link-button', 'true')
        buttonElement.type = 'button'
        buttonElement.className = 'inline-flex items-center justify-center gap-2 rounded-md bg-green-600 hover:bg-green-700 text-sm font-medium text-white h-9 px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
        buttonElement.innerHTML = `
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>Привязать</span>
        `
        buttonElement.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          onLinkClick()
        }
        
        // Insert AFTER the "Add" button in the same parent Container
        if (addButton.nextSibling) {
          addButtonParent.insertBefore(buttonElement, addButton.nextSibling)
        } else {
          addButtonParent.appendChild(buttonElement)
        }
      }
      
      // Try to insert immediately
      insertButton()
      
      // Also try after a short delay in case DataTable hasn't rendered yet
      const timeoutId = setTimeout(insertButton, 100)
      
      // Also observe for DOM changes
      const observer = new MutationObserver(() => {
        insertButton()
      })
      
      if (ContainerRef.current) {
        observer.observe(ContainerRef.current, {
          childList: true,
          subtree: true
        })
      }
      
      return () => {
        clearTimeout(timeoutId)
        observer.disconnect()
        // Cleanup on unmount
        const existingButton = ContainerRef.current?.querySelector('[data-link-button]')
        if (existingButton) {
          existingButton.remove()
        }
      }
    }, [onLinkClick])
    
    return (
      <div ref={ContainerRef}>
        <DataTable />
      </div>
    )
  }
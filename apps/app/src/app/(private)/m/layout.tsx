import { ReactNode } from "react"
import MLayout from "@/packages/components/blocks-app/m/MLayout"

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <MLayout>
      {children}
    </MLayout>
  )
}



import { ReactNode } from "react"
import SLayout from "@/packages/components/blocks-app/s/SLayout"

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <SLayout>
      {children}
    </SLayout>
  )
}



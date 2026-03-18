import { ReactNode } from "react"
import { Metadata } from "next"
import EditorAuthGuard from "@/packages/components/blocks-app/editor/EditorAuthGuard";

export const metadata: Metadata = {
  title: {
    template: "%s - Editor Panel",
    default: "Editor Panel",
  },
}

export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <EditorAuthGuard>
        <main>{children}</main>
      </EditorAuthGuard>
    </div>
  );
}


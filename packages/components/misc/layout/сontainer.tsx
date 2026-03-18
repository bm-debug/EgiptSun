import { LAYOUT_CONFIG } from "@/settings";

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ContainerWidth = "1440px" } = LAYOUT_CONFIG;

  return (
    <div
      className={`mx-auto px-4 ${className ?? ""}`.trim()}
      style={{ width: ContainerWidth, maxWidth: "100%" }}
    >
      {children}
    </div>
  );
}

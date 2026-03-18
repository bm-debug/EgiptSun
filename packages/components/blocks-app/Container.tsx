import { LAYOUT_CONFIG } from "@/settings";

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ContainerWidth } = LAYOUT_CONFIG;

  return (
    <div
      className={`mx-auto px-4 ${className}`}
      style={{ maxWidth: ContainerWidth, width: '100%' }}
    >
      {children}
    </div>
  );
}

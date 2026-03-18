import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";

export default function NotFound() {
  const Component = PUBLIC_PAGES_COMPONENTS["404"];
  if (!Component) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
      </div>
    );
  }
  return <Component />;
}


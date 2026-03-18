"use client";

import React, { createContext, useContext } from "react";

type PublicContentValue = {
  header: Record<string, unknown> | null;
  footer: Record<string, unknown> | null;
};

const PublicContentContext = createContext<PublicContentValue | undefined>(undefined);

type PublicContentProviderProps = {
  children: React.ReactNode;
  header: Record<string, unknown> | null;
  footer: Record<string, unknown> | null;
};

export function PublicContentProvider({ children, header, footer }: PublicContentProviderProps) {
  return (
    <PublicContentContext.Provider value={{ header, footer }}>
      {children}
    </PublicContentContext.Provider>
  );
}

export function usePublicContent(): PublicContentValue {
  const context = useContext(PublicContentContext);
  if (context === undefined) {
    return { header: null, footer: null };
  }
  return context;
}

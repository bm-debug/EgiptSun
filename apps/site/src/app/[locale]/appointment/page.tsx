import type { Metadata } from "next";
import { PUBLIC_PAGES_COMPONENTS } from "@/app-public-components";
import { getTranslations, getTranslationValue } from "@/lib/get-translations";
import { PROJECT_SETTINGS } from "@/settings";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.appointment.title") || "Book an Appointment";
  const description = getTranslationValue(translations, "pages.appointment.description") || "";

  return {
    title: `${title} | ${PROJECT_SETTINGS.name}`,
    description,
  };
}

export default async function AppointmentPage() {
  if (!PUBLIC_PAGES_COMPONENTS.appointment) {
    notFound();
  }
  const translations = await getTranslations();
  const title = getTranslationValue(translations, "pages.appointment.title") || "Book an Appointment";
  const description = getTranslationValue(translations, "pages.appointment.description") || "";

  return <PUBLIC_PAGES_COMPONENTS.appointment title={title} description={description} />;
}

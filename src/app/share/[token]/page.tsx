import { notFound } from "next/navigation";
import { CritiqueResultCard } from "@/components/gallery/CritiqueResultCard";
import { GET as getSharedCritique } from "@/app/api/share/[token]/route";
import type { ShareApiResponse } from "@/lib/galleryShare";
import { getTranslations } from "@/lib/i18n";

export const metadata = {
  robots: { index: false, follow: false },
};

type SharePageProps = {
  params: Promise<{ token: string }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const response = await getSharedCritique(new Request(`https://banal.art/api/share/${token}`), {
    params: Promise.resolve({ token }),
  });
  const t = getTranslations("en");

  if (!response.ok) {
    notFound();
  }

  const critique = await response.json() as ShareApiResponse;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <p className="mb-6 text-xs text-[var(--muted)] uppercase tracking-widest">
        {t.readOnlyShareLabel}
      </p>
      <CritiqueResultCard
        titulo={critique.titulo}
        critica={critique.critica}
        imageUrl={critique.imageUrl}
        audioUrl={critique.audioUrl}
        locale="en"
        readOnly
        shareUrl={`/share/${token}`}
      />
    </main>
  );
}

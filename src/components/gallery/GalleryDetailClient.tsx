"use client";

import { useState } from "react";
import { getTranslations, type Locale } from "@/lib/i18n";
import { CritiqueResultCard } from "@/components/gallery/CritiqueResultCard";
import type { GalleryCritique } from "@/lib/galleryShare";

type GalleryDetailClientProps = {
  critique: GalleryCritique;
  initialShareUrl?: string | null;
  locale?: Locale;
};

export function GalleryDetailClient({
  critique,
  initialShareUrl = critique.share_token ? `/share/${critique.share_token}` : null,
  locale = "en",
}: GalleryDetailClientProps) {
  const t = getTranslations(locale);
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const updateShare = async (shared: boolean) => {
    if (!shared && !confirm(t.revokeShareConfirm)) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/gallery/${critique.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared }),
      });

      if (!response.ok) {
        throw new Error("share_update_failed");
      }

      const data = (await response.json()) as { shareUrl: string | null };
      setShareUrl(data.shareUrl);
    } catch {
      setError(t.shareError);
    } finally {
      setLoading(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="w-full max-w-2xl mx-auto px-4 py-10">
      <CritiqueResultCard
        titulo={critique.titulo}
        critica={critique.critica}
        imageUrl={critique.image_path}
        audioUrl={critique.audio_path ?? undefined}
        locale={locale}
        shareUrl={shareUrl ?? undefined}
      />

      <div className="mt-8 border-t border-[var(--border)] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest">{t.shareToggle}</h2>
        {shareUrl ? (
          <div className="mt-3 flex flex-col gap-3">
            <output className="text-sm break-all rounded border border-[var(--border)] px-3 py-2">
              {shareUrl}
            </output>
            <div className="flex flex-wrap gap-2">
              <button onClick={copyShareUrl} disabled={loading} className="cursor-pointer px-4 py-2 border rounded-full text-sm">
                {copied ? t.shareUrlCopied : t.copyLink}
              </button>
              <button onClick={() => updateShare(false)} disabled={loading} className="cursor-pointer px-4 py-2 border rounded-full text-sm">
                {t.revokeShare}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => updateShare(true)} disabled={loading} className="mt-3 cursor-pointer px-4 py-2 border rounded-full text-sm">
            {loading ? t.shareLoading : t.enableShare}
          </button>
        )}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { getTranslations, type Locale } from "@/lib/i18n";

function shareTargetUrl(shareUrl?: string, origin?: string): string {
  return shareUrl ?? origin ?? (typeof window === "undefined" ? "" : window.location.origin);
}

export function buildWhatsAppUrl(titulo: string, critica: string, shareUrl?: string, origin?: string): string {
  const text = [`"${titulo}" - banal.art`, "", critica, shareTargetUrl(shareUrl, origin)].filter(Boolean).join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildTwitterUrl(titulo: string, shareUrl?: string, origin?: string): string {
  const url = shareTargetUrl(shareUrl, origin);
  const text = `"${titulo}" - via banal.art`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function buildCopyText(titulo: string, critica: string, shareUrl?: string, origin?: string): string {
  return [`"${titulo}" - banal.art`, "", critica, shareTargetUrl(shareUrl, origin)].filter(Boolean).join("\n");
}

type CritiqueResultCardProps = {
  titulo: string;
  critica: string;
  imageUrl: string;
  audioUrl?: string;
  locale?: Locale;
  readOnly?: boolean;
  shareUrl?: string;
  onReset?: () => void;
  onVariation?: () => void;
  onDelete?: () => void;
};

export function CritiqueResultCard({
  titulo,
  critica,
  imageUrl,
  audioUrl,
  locale = "en",
  readOnly = false,
  shareUrl,
  onReset,
  onVariation,
  onDelete,
}: CritiqueResultCardProps) {
  const t = getTranslations(locale);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(buildCopyText(titulo, critica, shareUrl));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="w-full max-w-lg" aria-label={readOnly ? t.readOnlyShareLabel : undefined}>
      <div className="mb-8 bg-[#2a2a2a] p-3 md:p-4 shadow-2xl">
        <div className="border border-[#c9a96e]/30">
          <img src={imageUrl} alt={titulo} className="w-full max-h-96 object-cover" />
        </div>
      </div>

      <div className="bg-white border border-[var(--border)] shadow-md p-6 md:p-8 text-center">
        <h1 className="font-[family-name:var(--font-serif)] text-2xl md:text-3xl font-bold italic mb-1">
          &ldquo;{titulo}&rdquo;
        </h1>
        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-6">
          {t.artist} &middot; {t.medium} &middot; 2026
        </p>
        <div className="w-12 h-px bg-[var(--accent)] mx-auto mb-6" />
        <p className="font-[family-name:var(--font-serif)] text-base md:text-lg leading-relaxed text-[var(--foreground)]/80 italic">
          {critica}
        </p>
      </div>

      {audioUrl && (
        <div className="mt-6 flex justify-center">
          <audio controls src={audioUrl} aria-label={t.listenCritique} />
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-3 mt-4 items-center justify-center">
          {onVariation && (
            <button onClick={onVariation} className="cursor-pointer px-6 py-3 border rounded-full text-sm">
              {t.anotherCritique}
            </button>
          )}
          {onReset && (
            <button onClick={onReset} className="cursor-pointer px-6 py-3 border rounded-full text-sm">
              {t.newExhibit}
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="cursor-pointer px-6 py-3 border rounded-full text-sm">
              {t.deleteCritique}
            </button>
          )}
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-2">{t.shareSection}</p>
        <div className="flex gap-3 items-center justify-center">
          <a
            href={buildWhatsAppUrl(titulo, critica, shareUrl)}
            aria-label={t.shareWhatsApp}
            className="flex items-center justify-center w-11 h-11 rounded-full border border-[var(--border)]"
          >
            WA
          </a>
          <a
            href={buildTwitterUrl(titulo, shareUrl)}
            aria-label={t.shareTwitter}
            className="flex items-center justify-center w-11 h-11 rounded-full border border-[var(--border)]"
          >
            X
          </a>
          <button
            onClick={copy}
            aria-label={copied ? t.shareUrlCopied : t.copyLink}
            className="cursor-pointer flex items-center justify-center w-11 h-11 rounded-full border border-[var(--border)]"
          >
            {copied ? "OK" : "Copy"}
          </button>
        </div>
      </div>
    </article>
  );
}

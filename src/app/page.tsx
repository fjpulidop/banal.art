"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { detectLocale, getTranslations, type Locale } from "@/lib/i18n";
import { compressImage } from "@/lib/compress";
import { generateMuseumPlaque } from "@/lib/canvas";
import UserMenu from "@/components/UserMenu";

type ExportFormat = "story" | "square" | "banner";

interface Critique {
  titulo: string;
  critica: string;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [image, setImage] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVariating, setIsVariating] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState("");
  const [result, setResult] = useState<Critique | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("story");
  const [supportsWebShare, setSupportsWebShare] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phraseInterval = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const t = getTranslations(locale);

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  useEffect(() => {
    setSupportsWebShare(typeof navigator.share === "function");
  }, []);

  const rotatePhrase = useCallback(() => {
    const phrases = getTranslations(locale).loading;
    setLoadingPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
  }, [locale]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Compress image
    const compressed = await compressImage(file);
    setCompressedImage(compressed);

    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(compressed);

    setLoading(true);
    setResult(null);
    rotatePhrase();
    phraseInterval.current = setInterval(rotatePhrase, 2500);

    try {
      const formData = new FormData();
      formData.append("image", compressed);
      formData.append("lang", locale);

      const res = await fetch("/api/critique", { method: "POST", body: formData });

      if (res.status === 429) {
        setError(t.genericError);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.error) {
        setError(data.message || t.genericError);
      } else {
        setResult(data);
        fetchAudio(data.critica);
      }
    } catch {
      setError(t.genericError);
    } finally {
      setLoading(false);
      if (phraseInterval.current) clearInterval(phraseInterval.current);
    }
  };

  const fetchAudio = async (text: string) => {
    setAudioLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: locale }),
      });

      if (!res.ok) {
        setAudioLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setAudioPlaying(false);
    } catch {
      // Audio is optional — fail silently
    } finally {
      setAudioLoading(false);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play();
      setAudioPlaying(true);
    }
  };

  const handleDownload = async () => {
    if (!result || !image) return;

    const blob = await generateMuseumPlaque({
      imageDataUrl: image,
      titulo: result.titulo,
      critica: result.critica,
      artist: t.artist,
      medium: t.medium,
      format: selectedFormat,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `banal-art-${selectedFormat}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!result || !image) return;

    try {
      const blob = await generateMuseumPlaque({
        imageDataUrl: image,
        titulo: result.titulo,
        critica: result.critica,
        artist: t.artist,
        medium: t.medium,
        format: selectedFormat,
      });

      const file = new File([blob], "banal-art.png", { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `"${result.titulo}" — banal.art`,
          text: result.critica.slice(0, 100) + "...",
          files: [file],
        });
      } else {
        // Fallback: download
        await handleDownload();
      }
    } catch {
      await handleDownload();
    }
  };

  const buildWhatsAppUrl = (titulo: string, critica: string): string => {
    const text = `"${titulo}" — banal.art\n\n${critica}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const buildTwitterUrl = (titulo: string): string => {
    const text = `"${titulo}" — via banal.art`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      const text = `"${result.titulo}" — banal.art\n\n${result.critica}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fail silently
    }
  };

  const VARIATIONS = ["absurdist", "academic"] as const;

  const handleVariation = async () => {
    if (!compressedImage) return;

    setIsVariating(true);
    setError(null);
    rotatePhrase();
    phraseInterval.current = setInterval(rotatePhrase, 2500);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioUrl(null);
    setAudioPlaying(false);

    const variation = VARIATIONS[Math.floor(Math.random() * VARIATIONS.length)];

    try {
      const formData = new FormData();
      formData.append("image", compressedImage);
      formData.append("lang", locale);
      formData.append("variation", variation);

      const res = await fetch("/api/critique", { method: "POST", body: formData });

      if (res.status === 429) {
        setError(t.genericError);
        return;
      }

      const data = await res.json();
      if (data.error) {
        setError(data.message || t.genericError);
      } else {
        setResult(data);
        fetchAudio(data.critica);
      }
    } catch {
      setError(t.genericError);
    } finally {
      setIsVariating(false);
      if (phraseInterval.current) clearInterval(phraseInterval.current);
    }
  };

  const reset = () => {
    setImage(null);
    setCompressedImage(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setIsVariating(false);
    setAudioUrl(null);
    setAudioLoading(false);
    setAudioPlaying(false);
    setCopied(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSelectedFormat("story");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Top Bar */}
      <div className="fixed top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setLocale(locale === "en" ? "es" : "en")}
          className="cursor-pointer px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-full hover:bg-white/80 transition-colors bg-[var(--background)]"
        >
          {locale === "en" ? "ES" : "EN"}
        </button>
        <UserMenu />
      </div>

      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="font-[family-name:var(--font-serif)] text-4xl md:text-6xl font-bold tracking-tight mb-3">
          {t.title}
        </h1>
        <p className="text-[var(--muted)] font-light text-lg md:text-xl italic font-[family-name:var(--font-serif)]">
          {t.subtitle}
        </p>
      </header>

      {/* Upload Area */}
      {!image && !loading && !error && (
        <div className="animate-fade-in w-full max-w-md">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full group cursor-pointer border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-lg p-16 transition-all duration-300 hover:bg-white/50"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-[var(--accent)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-7 h-7 text-[var(--accent)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </div>
              <span className="font-[family-name:var(--font-serif)] text-xl text-[var(--accent)]">
                {t.cta}
              </span>
              <span className="text-sm text-[var(--muted)]">
                {t.ctaSub}
              </span>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="animate-fade-in text-center max-w-md">
          {image && (
            <div className="mb-8">
              <div className="border-8 border-[#2a2a2a] shadow-2xl">
                <img
                  src={image}
                  alt="Your masterpiece"
                  className="w-full max-h-80 object-cover opacity-70"
                />
              </div>
            </div>
          )}
          <p className="font-[family-name:var(--font-serif)] text-xl italic text-[var(--accent)] animate-pulse-slow">
            {loadingPhrase}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="animate-fade-in text-center max-w-md">
          <p className="font-[family-name:var(--font-serif)] text-lg italic text-[var(--accent)] mb-6">
            {error}
          </p>
          <button
            onClick={reset}
            className="cursor-pointer px-6 py-3 border border-[var(--border)] rounded-full text-sm font-medium hover:bg-white/80 transition-colors"
          >
            {t.newExhibit}
          </button>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="animate-fade-in w-full max-w-lg">
          {/* Framed Image */}
          <div className="mb-8">
            <div className="bg-[#2a2a2a] p-3 md:p-4 shadow-2xl">
              <div className="border border-[#c9a96e]/30">
                {image && (
                  <img
                    src={image}
                    alt="Your masterpiece"
                    className="w-full max-h-96 object-cover"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Museum Plaque */}
          <div className="bg-white border border-[var(--border)] shadow-md p-6 md:p-8 text-center">
            <h2 className="font-[family-name:var(--font-serif)] text-2xl md:text-3xl font-bold italic mb-1">
              &ldquo;{result.titulo}&rdquo;
            </h2>
            <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-6">
              {t.artist} &middot; {t.medium} &middot; 2026
            </p>
            <div className="w-12 h-px bg-[var(--accent)] mx-auto mb-6" />
            <p className="font-[family-name:var(--font-serif)] text-base md:text-lg leading-relaxed text-[var(--foreground)]/80 italic">
              {result.critica}
            </p>
          </div>

          {/* Audio Player */}
          {(audioLoading || audioUrl) && (
            <div className="mt-6 flex justify-center">
              {audioLoading ? (
                <p className="text-sm italic text-[var(--muted)] animate-pulse-slow">
                  {t.audioLoading}
                </p>
              ) : audioUrl ? (
                <button
                  onClick={toggleAudio}
                  className="cursor-pointer flex items-center gap-3 px-5 py-3 border border-[var(--border)] rounded-full hover:bg-white/80 transition-colors group"
                >
                  {audioPlaying ? (
                    <svg className="w-5 h-5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                  <span className="text-sm font-[family-name:var(--font-serif)] text-[var(--accent)]">
                    {t.listenCritique}
                  </span>
                </button>
              ) : null}
            </div>
          )}

          {/* Format Selector */}
          <div
            role="radiogroup"
            aria-label={t.formatSelectorLabel}
            className="flex gap-2 mt-8 justify-center"
          >
            {(["story", "square", "banner"] as ExportFormat[]).map((fmt) => {
              const labels: Record<ExportFormat, string> = {
                story: t.formatStory,
                square: t.formatSquare,
                banner: t.formatBanner,
              };
              const isActive = selectedFormat === fmt;
              return (
                <button
                  key={fmt}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`cursor-pointer rounded-full text-xs font-medium px-4 py-1.5 transition-colors ${
                    isActive
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "border border-[var(--border)] hover:bg-white/80"
                  }`}
                >
                  {labels[fmt]}
                </button>
              );
            })}
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap gap-3 mt-4 items-center justify-center">
            <button
              onClick={handleVariation}
              disabled={isVariating || audioLoading}
              className="cursor-pointer px-6 py-3 border border-[var(--accent)] text-[var(--accent)] rounded-full text-sm font-medium hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVariating ? loadingPhrase : t.anotherCritique}
            </button>
            <button
              onClick={reset}
              className="cursor-pointer px-6 py-3 border border-[var(--border)] rounded-full text-sm font-medium hover:bg-white/80 transition-colors"
            >
              {t.newExhibit}
            </button>
            <button
              onClick={handleDownload}
              className="cursor-pointer px-6 py-3 bg-[var(--foreground)] text-[var(--background)] rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t.download}
            </button>
          </div>

          {/* Share Icons */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-2">{t.shareSection}</p>
            <div className="flex gap-3 items-center justify-center">
              {supportsWebShare && (
                <button
                  onClick={handleShare}
                  aria-label={t.share}
                  className="cursor-pointer flex items-center justify-center w-11 h-11 rounded-full border border-[var(--border)] hover:bg-white/80 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => result && window.open(buildWhatsAppUrl(result.titulo, result.critica), "_blank")}
                aria-label={t.shareWhatsApp}
                className="cursor-pointer flex items-center justify-center w-11 h-11 rounded-full border border-[var(--border)] hover:bg-white/80 transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path
                    d="M16 2C8.268 2 2 8.268 2 16c0 2.506.657 4.857 1.804 6.9L2 30l7.338-1.774A13.924 13.924 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2z"
                    fill="#25D366"
                  />
                  <path
                    d="M22.003 19.398c-.3-.15-1.77-.872-2.045-.972-.274-.1-.473-.15-.673.15-.199.3-.773.972-.947 1.172-.174.2-.348.225-.648.075-.3-.15-1.266-.466-2.412-1.483-.891-.793-1.493-1.772-1.668-2.072-.174-.3-.018-.462.131-.61.134-.134.3-.349.449-.524.15-.174.2-.3.3-.498.099-.2.05-.374-.026-.524-.075-.15-.672-1.62-.921-2.22-.243-.583-.49-.504-.673-.514l-.573-.01c-.2 0-.523.075-.797.374-.274.3-1.047 1.023-1.047 2.495s1.072 2.893 1.221 3.093c.15.199 2.11 3.22 5.112 4.515.715.308 1.273.492 1.708.63.717.228 1.37.196 1.886.119.575-.086 1.77-.723 2.02-1.421.249-.699.249-1.298.174-1.423-.074-.124-.274-.199-.573-.349z"
                    fill="#fff"
                  />
                </svg>
              </button>
              <button
                onClick={() => result && window.open(buildTwitterUrl(result.titulo), "_blank")}
                aria-label={t.shareTwitter}
                className="cursor-pointer flex items-center justify-center w-11 h-11 rounded-full border border-[var(--border)] hover:bg-white/80 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
              <button
                onClick={handleCopy}
                aria-label={copied ? t.copied : t.copyLink}
                className="cursor-pointer flex items-center justify-center w-11 h-11 rounded-full border border-[var(--border)] hover:bg-white/80 transition-colors"
              >
                {copied ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto pt-16 pb-6 text-center">
        <p className="text-xs text-[var(--muted)]">
          {t.footer}
        </p>
      </footer>
    </div>
  );
}

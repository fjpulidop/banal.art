"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { detectLocale, getTranslations, type Locale } from "@/lib/i18n";
import { compressImage } from "@/lib/compress";
import { generateMuseumPlaque } from "@/lib/canvas";
import UserMenu from "@/components/UserMenu";

interface Critique {
  titulo: string;
  critica: string;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState("");
  const [result, setResult] = useState<Critique | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phraseInterval = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const t = getTranslations(locale);

  useEffect(() => {
    setLocale(detectLocale());
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
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `banal-art-${Date.now()}.png`;
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

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setAudioUrl(null);
    setAudioLoading(false);
    setAudioPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
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
            <button
              onClick={handleShare}
              className="cursor-pointer px-6 py-3 bg-[var(--accent)] text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t.share}
            </button>
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

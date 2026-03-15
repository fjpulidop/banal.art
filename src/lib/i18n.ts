export type Locale = "en" | "es";

const translations = {
  en: {
    title: "banal.art",
    subtitle: "The Gallery of the Mundane",
    cta: "Exhibit Your Masterpiece",
    ctaSub: "Upload a photo of any mundane object",
    newExhibit: "New Exhibit",
    download: "Download Artwork",
    share: "Share",
    listenCritique: "Listen to the Critique",
    audioLoading: "The critic clears his throat...",
    audioUnavailable: "Audio narration unavailable",
    footer: "Every object deserves its moment in the gallery.",
    artist: "Anonymous",
    medium: "Mixed media on digital canvas",
    shareTwitter: "Share on X",
    shareSection: "Share",
    formatSelectorLabel: "Export format",
    formatStory: "Story (9:16)",
    formatSquare: "Square (1:1)",
    formatBanner: "Banner (16:9)",
    shareWhatsApp: "Share via WhatsApp",
    copyLink: "Copy to Clipboard",
    copied: "Copied!",
    anotherCritique: "Generate Another Critique",
    variationLoading: "Consulting a rival critic...",
    nsfwError: "This piece is too avant-garde — even for my refined taste.",
    genericError: "The critics are temporarily unavailable. Even art has its off days.",
    loading: [
      "Adjusting the monocle...",
      "Consulting Dali's spirit...",
      "Analyzing the brushstrokes...",
      "Debating with the curator...",
      "Polishing the gallery frame...",
      "Sipping champagne pensively...",
      "Contemplating the void...",
      "Writing a 12-page thesis...",
    ],
  },
  es: {
    title: "banal.art",
    subtitle: "La Galeria de lo Cotidiano",
    cta: "Exhibir tu Obra Maestra",
    ctaSub: "Sube una foto de cualquier objeto mundano",
    newExhibit: "Nueva Obra",
    download: "Descargar Obra",
    share: "Compartir",
    listenCritique: "Escuchar la Critica",
    audioLoading: "El critico carraspea...",
    audioUnavailable: "Narracion de audio no disponible",
    footer: "Todo objeto merece su momento en la galeria.",
    artist: "Anonimo",
    medium: "Tecnica mixta sobre lienzo digital",
    shareTwitter: "Compartir en X",
    shareSection: "Compartir",
    formatSelectorLabel: "Formato de exportación",
    formatStory: "Historia (9:16)",
    formatSquare: "Cuadrado (1:1)",
    formatBanner: "Banner (16:9)",
    shareWhatsApp: "Compartir por WhatsApp",
    copyLink: "Copiar al Portapapeles",
    copied: "Copiado!",
    anotherCritique: "Generar Otra Critica",
    variationLoading: "Consultando a un critico rival...",
    nsfwError: "Esta pieza es demasiado vanguardista incluso para mi refinado gusto.",
    genericError: "Los criticos no estan disponibles. Hasta el arte tiene sus dias malos.",
    loading: [
      "Ajustando el monoculo...",
      "Consultando al espiritu de Dali...",
      "Analizando las pinceladas...",
      "Debatiendo con el comisario...",
      "Puliendo el marco de la galeria...",
      "Sorbiendo champan con aire pensativo...",
      "Contemplando el vacio...",
      "Escribiendo una tesis de 12 paginas...",
    ],
  },
} as const;

export function getTranslations(locale: Locale) {
  return translations[locale];
}

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("es")) return "es";
  return "en";
}

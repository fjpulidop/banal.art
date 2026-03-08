import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_DAY = 5;

const mockCritiques = [
  {
    titulo: "La dualidad del hidrato, 2026",
    critica:
      "Una obra que desafia los canones establecidos del bodegon postmoderno. La textura del gluten, capturada con una maestria que recuerda a los primeros daguerrotipos, nos habla de la fragilidad del ser humano ante el paso del tiempo. El artista, claramente influenciado por el movimiento neobrutalista gastronomico, nos invita a reflexionar: somos nosotros quienes consumimos el pan, o es el pan quien nos consume a nosotros?",
  },
  {
    titulo: "Oda al caos domestico (Serie III)",
    critica:
      "Estamos ante una pieza que trasciende la mera representacion visual para adentrarse en el terreno de lo existencial. La composicion, aparentemente descuidada, esconde una geometria sagrada que solo los ojos mas entrenados pueden descifrar. Cada elemento disperso es una metafora del desorden interior que todos llevamos dentro, pero que pocos tienen el coraje de exhibir en una galeria.",
  },
  {
    titulo: "Naturaleza muerta con calcetin desparejado",
    critica:
      "El artista nos presenta aqui una reflexion devastadora sobre la soledad contemporanea. El calcetin, separado de su par, se erige como simbolo universal de la desconexion humana en la era digital. La paleta cromatica, dominada por ese gris institucional que recuerda a las lavanderias de madrugada, evoca una melancolia que Rothko habria envidiado profundamente.",
  },
];

const SYSTEM_PROMPT = `You are a Louvre art critic — extremely pretentious, snobby, and pedantic.
Analyze the mundane image provided and treat it as a profound contemporary masterpiece.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "titulo": "A pompous, artistic title for the piece",
  "critica": "A critique of maximum 3 short paragraphs. Use absurd philosophical language about texture, lighting, or the hidden meaning of the everyday object. Be witty and humorous."
}

IMPORTANT: Detect the user's language from the "lang" field and respond in that language.
If lang is "es", respond entirely in Spanish. If "en", respond in English.`;

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (entry) {
    if (now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + 86400000 });
    } else if (entry.count >= MAX_PER_DAY) {
      return NextResponse.json(
        { error: "rate_limit", message: "Daily limit reached. The gallery is closed for today." },
        { status: 429 }
      );
    } else {
      entry.count++;
    }
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 86400000 });
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Mock mode
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const critique = mockCritiques[Math.floor(Math.random() * mockCritiques.length)];
    return NextResponse.json(critique);
  }

  // Real Claude API
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    const lang = (formData.get("lang") as string) || "en";

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const mediaType = imageFile.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `lang: "${lang}". Analyze this mundane object as a masterpiece.`,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const parsed = JSON.parse(textContent.text);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Claude API error:", error);
    // Fallback to mock
    const critique = mockCritiques[Math.floor(Math.random() * mockCritiques.length)];
    return NextResponse.json(critique);
  }
}

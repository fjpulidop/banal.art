import { NextRequest, NextResponse } from "next/server";

// Default to "Daniel" - a British English voice. User can override via env.
const DEFAULT_VOICE_ID = "onwK4e9ZLuTAKqWW03F9";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "no_api_key", message: "ElevenLabs API key not configured" },
      { status: 501 }
    );
  }

  try {
    const { text, lang } = await request.json();

    if (!text || text.length > 2000) {
      return NextResponse.json(
        { error: "invalid_text", message: "Text is required and must be under 2000 chars" },
        { status: 400 }
      );
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: lang === "es" ? "eleven_multilingual_v2" : "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.3,
            similarity_boost: 0.8,
            style: 0.7,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs error:", err);
      return NextResponse.json(
        { error: "tts_failed", message: "Audio generation failed" },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "tts_error", message: "Failed to generate audio" },
      { status: 500 }
    );
  }
}

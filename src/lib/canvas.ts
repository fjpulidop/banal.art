type ExportFormat = "story" | "square" | "banner";

interface PlaqueData {
  imageDataUrl: string;
  titulo: string;
  critica: string;
  artist?: string;
  medium?: string;
  year?: string;
  format?: ExportFormat;
}

interface FormatPreset {
  width: number;
  height: number;
  frameMargin: number;
  framePadding: number;
  frameTop: number;
  maxImgHeight: number;
  plaqueMargin: number;
  titleFont: string;
  titleLineHeight: number;
  subtitleFont: string;
  critiqueFont: string;
  critiqueLineHeight: number;
  watermarkFont: string;
  maxChars: number;
}

const FORMAT_PRESETS: Record<ExportFormat, FormatPreset> = {
  story: {
    width: 1080,
    height: 1920,
    frameMargin: 80,
    framePadding: 16,
    frameTop: 160,
    maxImgHeight: 800,
    plaqueMargin: 100,
    titleFont: 'italic bold 48px "Georgia", serif',
    titleLineHeight: 58,
    subtitleFont: '22px "Helvetica", sans-serif',
    critiqueFont: 'italic 30px "Georgia", serif',
    critiqueLineHeight: 42,
    watermarkFont: '24px "Helvetica", sans-serif',
    maxChars: 600,
  },
  square: {
    width: 1080,
    height: 1080,
    frameMargin: 60,
    framePadding: 12,
    frameTop: 80,
    maxImgHeight: 440,
    plaqueMargin: 80,
    titleFont: 'italic bold 36px "Georgia", serif',
    titleLineHeight: 44,
    subtitleFont: '18px "Helvetica", sans-serif',
    critiqueFont: 'italic 24px "Georgia", serif',
    critiqueLineHeight: 34,
    watermarkFont: '20px "Helvetica", sans-serif',
    maxChars: 320,
  },
  banner: {
    width: 1200,
    height: 675,
    frameMargin: 40,
    framePadding: 10,
    frameTop: 40,
    maxImgHeight: 540,
    plaqueMargin: 40,
    titleFont: 'italic bold 36px "Georgia", serif',
    titleLineHeight: 44,
    subtitleFont: '16px "Helvetica", sans-serif',
    critiqueFont: 'italic 22px "Georgia", serif',
    critiqueLineHeight: 30,
    watermarkFont: '18px "Helvetica", sans-serif',
    maxChars: 280,
  },
};

export async function generateMuseumPlaque(data: PlaqueData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const format = data.format || "story";
  const preset = FORMAT_PRESETS[format];

  const W = preset.width;
  const H = preset.height;
  canvas.width = W;
  canvas.height = H;

  // Background
  ctx.fillStyle = "#faf9f6";
  ctx.fillRect(0, 0, W, H);

  // Load user image
  const img = await loadImage(data.imageDataUrl);

  // Truncate critique for smaller formats
  const critiqueText = data.critica.length > preset.maxChars
    ? data.critica.slice(0, preset.maxChars).replace(/\s+\S*$/, "") + "..."
    : data.critica;

  if (format === "banner") {
    // Banner: side-by-side layout (image left, text right)
    const imgFraction = 0.45;
    const imgAreaW = Math.floor(W * imgFraction);
    const imgPad = 20;
    const imgAspect = img.width / img.height;
    const imgDrawH = Math.min(H - imgPad * 2, preset.maxImgHeight);
    const imgDrawW = Math.min(imgAreaW - imgPad * 2, imgDrawH * imgAspect);
    const imgX = imgPad + (imgAreaW - imgPad * 2 - imgDrawW) / 2;
    const imgY = (H - imgDrawH) / 2;

    // Dark frame behind image
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(imgX - 8, imgY - 8, imgDrawW + 16, imgDrawH + 16);

    // Gold inner border
    ctx.strokeStyle = "rgba(201, 169, 110, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(imgX - 1, imgY - 1, imgDrawW + 2, imgDrawH + 2);

    ctx.drawImage(img, imgX, imgY, imgDrawW, imgDrawH);

    // Text area on the right
    const textLeft = imgAreaW + 20;
    const textW = W - textLeft - 40;
    const textCenterX = textLeft + textW / 2;
    let currentY = 60;

    // Title
    ctx.fillStyle = "#1a1a1a";
    ctx.font = preset.titleFont;
    ctx.textAlign = "center";
    const titleText = `\u201C${data.titulo}\u201D`;
    wrapText(ctx, titleText, textCenterX, currentY, textW, preset.titleLineHeight);
    const titleLines = getWrappedLineCount(ctx, titleText, textW);
    currentY += titleLines * preset.titleLineHeight + 8;

    // Subtitle
    ctx.font = preset.subtitleFont;
    ctx.fillStyle = "#6b6b6b";
    const subtitle = `${data.artist || "Anonymous"} \u00B7 ${data.medium || "Mixed media on digital canvas"} \u00B7 ${data.year || "2026"}`;
    ctx.fillText(subtitle, textCenterX, currentY, textW);
    currentY += 30;

    // Divider
    ctx.fillStyle = "#8b7355";
    ctx.fillRect(textCenterX - 30, currentY, 60, 2);
    currentY += 24;

    // Critique
    ctx.fillStyle = "rgba(26, 26, 26, 0.8)";
    ctx.font = preset.critiqueFont;
    wrapText(ctx, critiqueText, textCenterX, currentY, textW, preset.critiqueLineHeight);

    // Watermark
    ctx.fillStyle = "#c0b9ae";
    ctx.font = preset.watermarkFont;
    ctx.fillText("banal.art", textCenterX, H - 30);
  } else {
    // Story and Square: stacked vertical layout
    const frameW = W - preset.frameMargin * 2;
    const imgAspect = img.width / img.height;
    const imgDrawW = frameW - preset.framePadding * 2;
    const imgDrawH = Math.min(imgDrawW / imgAspect, preset.maxImgHeight);
    const frameH = imgDrawH + preset.framePadding * 2;

    // Dark frame
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(preset.frameMargin, preset.frameTop, frameW, frameH);

    // Gold inner border
    ctx.strokeStyle = "rgba(201, 169, 110, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      preset.frameMargin + preset.framePadding - 1,
      preset.frameTop + preset.framePadding - 1,
      imgDrawW + 2,
      imgDrawH + 2
    );

    // Draw image
    const imgX = preset.frameMargin + preset.framePadding;
    const imgY = preset.frameTop + preset.framePadding;
    ctx.drawImage(img, imgX, imgY, imgDrawW, imgDrawH);

    // Plaque area
    const plaqueTop = preset.frameTop + frameH + (format === "square" ? 30 : 60);
    const plaqueW = W - preset.plaqueMargin * 2;

    // Title
    ctx.fillStyle = "#1a1a1a";
    ctx.font = preset.titleFont;
    ctx.textAlign = "center";
    const titleText = `\u201C${data.titulo}\u201D`;
    wrapText(ctx, titleText, W / 2, plaqueTop, plaqueW, preset.titleLineHeight);

    const titleLines = getWrappedLineCount(ctx, titleText, plaqueW);
    const afterTitle = plaqueTop + titleLines * preset.titleLineHeight + 10;

    // Subtitle (artist + medium + year)
    ctx.font = preset.subtitleFont;
    ctx.fillStyle = "#6b6b6b";
    const subtitle = `${data.artist || "Anonymous"} \u00B7 ${data.medium || "Mixed media on digital canvas"} \u00B7 ${data.year || "2026"}`;
    ctx.fillText(subtitle, W / 2, afterTitle + 10, plaqueW);

    // Divider
    const dividerY = afterTitle + 50;
    ctx.fillStyle = "#8b7355";
    ctx.fillRect(W / 2 - 40, dividerY, 80, 2);

    // Critique text
    ctx.fillStyle = "rgba(26, 26, 26, 0.8)";
    ctx.font = preset.critiqueFont;
    wrapText(ctx, critiqueText, W / 2, dividerY + 50, plaqueW, preset.critiqueLineHeight);

    // Watermark
    ctx.fillStyle = "#c0b9ae";
    ctx.font = preset.watermarkFont;
    ctx.fillText("banal.art", W / 2, H - 60);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png", 0.95);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== "") {
      ctx.fillText(line.trim(), x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}

function getWrappedLineCount(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): number {
  const words = text.split(" ");
  let line = "";
  let count = 1;

  for (const word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth && line !== "") {
      line = word + " ";
      count++;
    } else {
      line = testLine;
    }
  }
  return count;
}

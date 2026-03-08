interface PlaqueData {
  imageDataUrl: string;
  titulo: string;
  critica: string;
  artist?: string;
  medium?: string;
  year?: string;
}

export async function generateMuseumPlaque(data: PlaqueData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // 9:16 ratio for Stories/Reels
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;

  // Background
  ctx.fillStyle = "#faf9f6";
  ctx.fillRect(0, 0, W, H);

  // Load user image
  const img = await loadImage(data.imageDataUrl);

  // Frame dimensions
  const frameMargin = 80;
  const framePadding = 16;
  const frameTop = 160;
  const frameW = W - frameMargin * 2;
  const imgAspect = img.width / img.height;
  const imgDrawW = frameW - framePadding * 2;
  const imgDrawH = Math.min(imgDrawW / imgAspect, 800);
  const frameH = imgDrawH + framePadding * 2;

  // Dark frame
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(frameMargin, frameTop, frameW, frameH);

  // Gold inner border
  ctx.strokeStyle = "rgba(201, 169, 110, 0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    frameMargin + framePadding - 1,
    frameTop + framePadding - 1,
    imgDrawW + 2,
    imgDrawH + 2
  );

  // Draw image
  const imgX = frameMargin + framePadding;
  const imgY = frameTop + framePadding;
  ctx.drawImage(img, imgX, imgY, imgDrawW, imgDrawH);

  // Plaque area
  const plaqueTop = frameTop + frameH + 60;
  const plaqueMargin = 100;
  const plaqueW = W - plaqueMargin * 2;

  // Title
  ctx.fillStyle = "#1a1a1a";
  ctx.font = 'italic bold 48px "Georgia", serif';
  ctx.textAlign = "center";
  const titleText = `\u201C${data.titulo}\u201D`;
  wrapText(ctx, titleText, W / 2, plaqueTop, plaqueW, 58);

  const titleLines = getWrappedLineCount(ctx, titleText, plaqueW);
  const afterTitle = plaqueTop + titleLines * 58 + 10;

  // Subtitle (artist + medium + year)
  ctx.font = '22px "Helvetica", sans-serif';
  ctx.fillStyle = "#6b6b6b";
  const subtitle = `${data.artist || "Anonymous"} \u00B7 ${data.medium || "Mixed media on digital canvas"} \u00B7 ${data.year || "2026"}`;
  ctx.fillText(subtitle, W / 2, afterTitle + 10, plaqueW);

  // Divider
  const dividerY = afterTitle + 50;
  ctx.fillStyle = "#8b7355";
  ctx.fillRect(W / 2 - 40, dividerY, 80, 2);

  // Critique text
  ctx.fillStyle = "rgba(26, 26, 26, 0.8)";
  ctx.font = 'italic 30px "Georgia", serif';
  wrapText(ctx, data.critica, W / 2, dividerY + 50, plaqueW, 42);

  // Watermark
  ctx.fillStyle = "#c0b9ae";
  ctx.font = '24px "Helvetica", sans-serif';
  ctx.fillText("banal.art", W / 2, H - 60);

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

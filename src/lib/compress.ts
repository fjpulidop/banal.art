const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DIMENSION = 1600;

export async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_SIZE && file.type === "image/jpeg") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = getScaledDimensions(bitmap.width, bitmap.height);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.85;
  let blob = await canvas.convertToBlob({ type: "image/jpeg", quality });

  while (blob.size > MAX_SIZE && quality > 0.3) {
    quality -= 0.1;
    blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

function getScaledDimensions(w: number, h: number) {
  if (w <= MAX_DIMENSION && h <= MAX_DIMENSION) return { width: w, height: h };
  const ratio = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

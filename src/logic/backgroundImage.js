const MAX_SIDE = 2048;
const QUALITY = 0.84;

// Riduce la foto scelta a massimo 2048px di lato e la salva come JPEG:
// abbastanza nitida per uno sfondo, abbastanza leggera per restare nel browser.
export async function compressImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Scegli un file immagine (JPG, PNG, WebP…)");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", QUALITY);
}
